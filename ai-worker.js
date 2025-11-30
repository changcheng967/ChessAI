// Chess AI Web Worker for non-blocking search
let board = null;
let aiColor = null;
let playerColor = null;
let customDepth = 4;
let usePVS = true;

// Piece values for AI evaluation
const PIECE_VALUES = {
    'pawn': 100,
    'knight': 320,
    'bishop': 330,
    'rook': 500,
    'queen': 900,
    'king': 20000
};

// Position values for better piece placement evaluation
const POSITION_VALUES = {
    'pawn': [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    'knight': [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    'bishop': [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    'rook': [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [0, 0, 0, 5, 5, 0, 0, 0]
    ],
    'queen': [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    'king': [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20]
    ]
};

// Transposition table
let transpositionTable = new Map();
let nodesSearched = 0;
let pvsCuts = 0;
let searchStartTime = 0;
let maxDepthReached = 0;

// Message handler for the worker
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'INIT':
            board = data.board;
            aiColor = data.aiColor;
            playerColor = data.playerColor;
            customDepth = data.customDepth;
            usePVS = data.usePVS;
            transpositionTable.clear();
            nodesSearched = 0;
            pvsCuts = 0;
            searchStartTime = performance.now();
            maxDepthReached = 0;
            break;
            
        case 'FIND_BEST_MOVE':
            findBestMoveAsync();
            break;
            
        case 'STOP_SEARCH':
            // Worker can be terminated from main thread
            break;
    }
};

// Async best move finding with periodic yield
async function findBestMoveAsync() {
    const moves = getAllValidMoves(aiColor);
    if (moves.length === 0) {
        postResult(null);
        return;
    }
    
    const orderedMoves = orderMoves(moves, board, aiColor);
    
    if (usePVS) {
        const bestMove = await findBestMoveWithIterativeDeepeningAsync(orderedMoves, customDepth);
        postResult(bestMove);
    } else {
        const bestMove = findBestMoveAlphaBeta(orderedMoves, customDepth);
        postResult(bestMove);
    }
}

// Post result back to main thread
function postResult(bestMove) {
    const elapsedTime = performance.now() - searchStartTime;
    self.postMessage({
        type: 'SEARCH_COMPLETE',
        data: {
            bestMove,
            nodesSearched,
            pvsCuts,
            elapsedTime,
            maxDepthReached
        }
    });
}

// Yield control to prevent blocking UI
function yieldToBrowser() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

// Iterative deepening with async yields
async function findBestMoveWithIterativeDeepeningAsync(moves, maxDepth) {
    let bestMove = moves[0];
    let bestValue = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    
    // Iterative deepening
    for (let depth = 1; depth <= maxDepth; depth++) {
        maxDepthReached = depth;
        
        // Aspiration windows for deeper searches
        let searchAlpha, searchBeta;
        if (depth <= 2) {
            searchAlpha = -Infinity;
            searchBeta = Infinity;
        } else {
            searchAlpha = bestValue - 25;
            searchBeta = bestValue + 25;
        }
        
        let value;
        try {
            value = await pvsSearchAsync(board, depth, false, searchAlpha, searchBeta, aiColor);
        } catch (e) {
            // If aspiration window failed, do full search
            value = await pvsSearchAsync(board, depth, false, alpha, beta, aiColor);
        }
        
        if (value > bestValue) {
            bestValue = value;
            bestMove = await findBestMoveAtDepthAsync(board, depth, aiColor);
        }
        
        // Periodic yield to prevent blocking
        if (depth % 2 === 0) {
            await yieldToBrowser();
        }
        
        // Update status periodically
        if (depth % 3 === 0) {
            self.postMessage({
                type: 'SEARCH_PROGRESS',
                data: {
                    depth,
                    maxDepth,
                    nodesSearched,
                    pvsCuts
                }
            });
        }
    }
    
    return bestMove;
}

// Async PVS search with yielding
async function pvsSearchAsync(boardState, depth, isMaximizing, alpha, beta, color) {
    nodesSearched++;
    
    // Check transposition table
    const hash = generateZobristHash(boardState);
    const ttEntry = retrieveFromTT(hash, depth);
    
    if (ttEntry && ttEntry.flag === 0) {
        return ttEntry.value;
    }
    
    if (depth === 0 || isGameOverState(boardState, color)) {
        const evalValue = evaluateBoard(boardState, aiColor);
        storeInTT(hash, depth, evalValue, 0, null);
        return evalValue;
    }
    
    const currentColor = isMaximizing ? aiColor : playerColor;
    const moves = getAllValidMovesForColor(boardState, currentColor);
    const orderedMoves = orderMoves(moves, boardState, currentColor);
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        
        for (let i = 0; i < orderedMoves.length; i++) {
            const move = orderedMoves[i];
            const tempBoard = copyBoard(boardState);
            
            // Handle promotion moves
            if (move.promotion) {
                tempBoard[move.to.row][move.to.col] = { type: move.promotion, color: tempBoard[move.from.row][move.from.col].color };
            } else {
                tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
            }
            tempBoard[move.from.row][move.from.col] = null;
            
            let evaluation;
            
            if (i === 0) {
                evaluation = await pvsSearchAsync(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
            } else {
                evaluation = await pvsSearchAsync(tempBoard, depth - 1, false, alpha, alpha + 1, switchColor(color));
                
                if (evaluation > alpha) {
                    evaluation = await pvsSearchAsync(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
                }
            }
            
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, maxEval);
            
            if (beta <= alpha) {
                storeInTT(hash, depth, alpha, 1, move);
                break;
            }
            
            // Yield periodically for deeper searches
            if (depth > 3 && i % 10 === 0) {
                await yieldToBrowser();
            }
        }
        
        storeInTT(hash, depth, maxEval, 0, null);
        return maxEval;
    } else {
        let minEval = Infinity;
        
        for (let i = 0; i < orderedMoves.length; i++) {
            const move = orderedMoves[i];
            const tempBoard = copyBoard(boardState);
            
            // Handle promotion moves
            if (move.promotion) {
                tempBoard[move.to.row][move.to.col] = { type: move.promotion, color: tempBoard[move.from.row][move.from.col].color };
            } else {
                tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
            }
            tempBoard[move.from.row][move.from.col] = null;
            
            let evaluation;
            
            if (i === 0) {
                evaluation = await pvsSearchAsync(tempBoard, depth - 1, true, alpha, beta, switchColor(color));
            } else {
                evaluation = await pvsSearchAsync(tempBoard, depth - 1, true, beta - 1, beta, switchColor(color));
                
                if (evaluation < beta) {
                    evaluation = await pvsSearchAsync(tempBoard, depth - 1, true, alpha, beta, switchColor(color));
                }
            }
            
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, minEval);
            
            if (beta <= alpha) {
                storeInTT(hash, depth, beta, 2, move);
                break;
            }
            
            // Yield periodically for deeper searches
            if (depth > 3 && i % 10 === 0) {
                await yieldToBrowser();
            }
        }
        
        storeInTT(hash, depth, minEval, 0, null);
        return minEval;
    }
}

// Find best move at depth with async
async function findBestMoveAtDepthAsync(boardState, depth, color) {
    const moves = getAllValidMoves(color);
    if (moves.length === 0) return null;
    
    let bestMove = moves[0];
    let bestValue = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    
    const orderedMoves = orderMoves(moves, boardState, color);
    
    for (let i = 0; i < orderedMoves.length; i++) {
        const move = orderedMoves[i];
        const tempBoard = copyBoard(boardState);
        
        // Handle promotion moves
        if (move.promotion) {
            tempBoard[move.to.row][move.to.col] = { type: move.promotion, color: tempBoard[move.from.row][move.from.col].color };
        } else {
            tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
        }
        tempBoard[move.from.row][move.from.col] = null;
        
        const value = await pvsSearchAsync(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
        
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
        
        alpha = Math.max(alpha, bestValue);
        
        // Yield periodically
        if (i % 15 === 0) {
            await yieldToBrowser();
        }
    }
    
    return bestMove;
}

// Standard Alpha-Beta (synchronous for comparison)
function findBestMoveAlphaBeta(moves, depth) {
    let bestMove = moves[0];
    let bestValue = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    nodesSearched = 0;
    
    for (const move of moves) {
        const tempBoard = copyBoard(board);
        tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
        tempBoard[move.from.row][move.from.col] = null;
        
        const value = minimax(tempBoard, depth - 1, false, alpha, beta, aiColor);
        
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
        
        alpha = Math.max(alpha, bestValue);
        
        if (beta <= alpha) {
            break;
        }
    }
    
    return bestMove;
}

// Standard minimax (synchronous)
function minimax(boardState, depth, isMaximizing, alpha, beta, color) {
    nodesSearched++;
    
    if (depth === 0 || isGameOverState(boardState, color)) {
        return evaluateBoard(boardState, aiColor);
    }
    
    const currentColor = isMaximizing ? aiColor : playerColor;
    const moves = getAllValidMovesForColor(boardState, currentColor);
    const orderedMoves = orderMoves(moves, boardState, currentColor);
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of orderedMoves) {
            const tempBoard = copyBoard(boardState);
            tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
            tempBoard[move.from.row][move.from.col] = null;
            
            const evaluation = minimax(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of orderedMoves) {
            const tempBoard = copyBoard(boardState);
            tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
            tempBoard[move.from.row][move.from.col] = null;
            
            const evaluation = minimax(tempBoard, depth - 1, true, alpha, beta, switchColor(color));
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Utility functions (simplified versions for worker)
function getAllValidMoves(color) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const pieceMoves = getValidMoves(row, col);
                moves.push(...pieceMoves);
            }
        }
    }
    return moves;
}

function getAllValidMovesForColor(boardState, color) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece.color === color) {
                const pieceMoves = getValidMovesForPiece(boardState, row, col, piece);
                moves.push(...pieceMoves);
            }
        }
    }
    return moves;
}

function getValidMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    let moves = [];
    
    switch (piece.type) {
        case 'pawn':
            moves = getPawnMoves(row, col, piece.color);
            break;
        case 'rook':
            moves = getRookMoves(row, col, piece.color);
            break;
        case 'knight':
            moves = getKnightMoves(row, col, piece.color);
            break;
        case 'bishop':
            moves = getBishopMoves(row, col, piece.color);
            break;
        case 'queen':
            moves = getQueenMoves(row, col, piece.color);
            break;
        case 'king':
            moves = getKingMoves(row, col, piece.color);
            break;
    }
    
    return moves.filter(move => !isKingInCheckAfterMoveForBoard(board, move, piece.color));
}

function getValidMovesForPiece(boardState, row, col, piece) {
    let moves = [];
    
    switch (piece.type) {
        case 'pawn':
            moves = getPawnMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'rook':
            moves = getRookMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'knight':
            moves = getKnightMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'bishop':
            moves = getBishopMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'queen':
            moves = getQueenMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'king':
            moves = getKingMovesForBoard(boardState, row, col, piece.color);
            break;
    }
    
    return moves.filter(move => !isKingInCheckAfterMoveForBoard(boardState, move, piece.color));
}

// Simplified move generation functions (worker versions)
function getPawnMoves(row, col, color) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const promotionRow = color === 'white' ? 0 : 7;
    
    if (isInBounds(row + direction, col) && !board[row + direction][col]) {
        const newRow = row + direction;
        if (newRow === promotionRow) {
            const promotionPieces = ['queen', 'rook', 'bishop', 'knight'];
            promotionPieces.forEach(pieceType => {
                moves.push({
                    from: { row, col },
                    to: { row: newRow, col },
                    promotion: pieceType
                });
            });
        } else {
            moves.push({ from: { row, col }, to: { row: newRow, col } });
            if (row === startRow && !board[row + 2 * direction][col]) {
                moves.push({ from: { row, col }, to: { row: row + 2 * direction, col } });
            }
        }
    }
    
    const captureOffsets = [{ row: direction, col: -1 }, { row: direction, col: 1 }];
    captureOffsets.forEach(offset => {
        const newRow = row + offset.row;
        const newCol = col + offset.col;
        
        if (isInBounds(newRow, newCol) && board[newRow][newCol] && board[newRow][newCol].color !== color) {
            if (newRow === promotionRow) {
                const promotionPieces = ['queen', 'rook', 'bishop', 'knight'];
                promotionPieces.forEach(pieceType => {
                    moves.push({
                        from: { row, col },
                        to: { row: newRow, col: newCol },
                        promotion: pieceType
                    });
                });
            } else {
                moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
            }
        }
    });
    
    return moves;
}

function getRookMoves(row, col, color) {
    return getLinearMoves(row, col, color, [
        { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }
    ]);
}

function getBishopMoves(row, col, color) {
    return getLinearMoves(row, col, color, [
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 }
    ]);
}

function getQueenMoves(row, col, color) {
    return getLinearMoves(row, col, color, [
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 },
        { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }
    ]);
}

function getKnightMoves(row, col, color) {
    const moves = [];
    const offsets = [
        { row: -2, col: -1 }, { row: -2, col: 1 }, { row: -1, col: -2 }, { row: -1, col: 2 },
        { row: 1, col: -2 }, { row: 1, col: 2 }, { row: 2, col: -1 }, { row: 2, col: 1 }
    ];
    
    offsets.forEach(offset => {
        const newRow = row + offset.row;
        const newCol = col + offset.col;
        
        if (isInBounds(newRow, newCol)) {
            const targetPiece = board[newRow][newCol];
            if (!targetPiece || targetPiece.color !== color) {
                moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
            }
        }
    });
    
    return moves;
}

function getKingMoves(row, col, color) {
    const moves = [];
    const offsets = [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 },
        { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 }
    ];
    
    offsets.forEach(offset => {
        const newRow = row + offset.row;
        const newCol = col + offset.col;
        
        if (isInBounds(newRow, newCol)) {
            const targetPiece = board[newRow][newCol];
            if (!targetPiece || targetPiece.color !== color) {
                moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
            }
        }
    });
    
    return moves;
}

function getLinearMoves(row, col, color, directions) {
    const moves = [];
    
    directions.forEach(direction => {
        let newRow = row + direction.row;
        let newCol = col + direction.col;
        
        while (isInBounds(newRow, newCol)) {
            const targetPiece = board[newRow][newCol];
            
            if (!targetPiece) {
                moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
            } else {
                if (targetPiece.color !== color) {
                    moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
                }
                break;
            }
            
            newRow += direction.row;
            newCol += direction.col;
        }
    });
    
    return moves;
}

function getPawnMovesForBoard(boardState, row, col, color) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const promotionRow = color === 'white' ? 0 : 7;
    
    if (isInBounds(row + direction, col) && !boardState[row + direction][col]) {
        const newRow = row + direction;
        if (newRow === promotionRow) {
            const promotionPieces = ['queen', 'rook', 'bishop', 'knight'];
            promotionPieces.forEach(pieceType => {
                moves.push({
                    from: { row, col },
                    to: { row: newRow, col },
                    promotion: pieceType
                });
            });
        } else {
            moves.push({ from: { row, col }, to: { row: newRow, col } });
            
            if (row === startRow && !boardState[row + 2 * direction][col]) {
                moves.push({ from: { row, col }, to: { row: row + 2 * direction, col } });
            }
        }
    }
    
    const captureOffsets = [{ row: direction, col: -1 }, { row: direction, col: 1 }];
    captureOffsets.forEach(offset => {
        const newRow = row + offset.row;
        const newCol = col + offset.col;
        
        if (isInBounds(newRow, newCol) && boardState[newRow][newCol] && boardState[newRow][newCol].color !== color) {
            if (newRow === promotionRow) {
                const promotionPieces = ['queen', 'rook', 'bishop', 'knight'];
                promotionPieces.forEach(pieceType => {
                    moves.push({
                        from: { row, col },
                        to: { row: newRow, col: newCol },
                        promotion: pieceType
                    });
                });
            } else {
                moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
            }
        }
    });
    
    return moves;
}

function getRookMovesForBoard(boardState, row, col, color) {
    return getLinearMovesForBoard(boardState, row, col, color, [
        { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }
    ]);
}

function getBishopMovesForBoard(boardState, row, col, color) {
    return getLinearMovesForBoard(boardState, row, col, color, [
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 }
    ]);
}

function getQueenMovesForBoard(boardState, row, col, color) {
    return getLinearMovesForBoard(boardState, row, col, color, [
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 },
        { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }
    ]);
}

function getKnightMovesForBoard(boardState, row, col, color) {
    const moves = [];
    const offsets = [
        { row: -2, col: -1 }, { row: -2, col: 1 }, { row: -1, col: -2 }, { row: -1, col: 2 },
        { row: 1, col: -2 }, { row: 1, col: 2 }, { row: 2, col: -1 }, { row: 2, col: 1 }
    ];
    
    offsets.forEach(offset => {
        const newRow = row + offset.row;
        const newCol = col + offset.col;
        
        if (isInBounds(newRow, newCol)) {
            const targetPiece = boardState[newRow][newCol];
            if (!targetPiece || targetPiece.color !== color) {
                moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
            }
        }
    });
    
    return moves;
}

function getKingMovesForBoard(boardState, row, col, color) {
    const moves = [];
    const offsets = [
        { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
        { row: 0, col: -1 }, { row: 0, col: 1 },
        { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 }
    ];
    
    offsets.forEach(offset => {
        const newRow = row + offset.row;
        const newCol = col + offset.col;
        
        if (isInBounds(newRow, newCol)) {
            const targetPiece = boardState[newRow][newCol];
            if (!targetPiece || targetPiece.color !== color) {
                moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
            }
        }
    });
    
    return moves;
}

function getLinearMovesForBoard(boardState, row, col, color, directions) {
    const moves = [];
    
    directions.forEach(direction => {
        let newRow = row + direction.row;
        let newCol = col + direction.col;
        
        while (isInBounds(newRow, newCol)) {
            const targetPiece = boardState[newRow][newCol];
            
            if (!targetPiece) {
                moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
            } else {
                if (targetPiece.color !== color) {
                    moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
                }
                break;
            }
            
            newRow += direction.row;
            newCol += direction.col;
        }
    });
    
    return moves;
}

function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isKingInCheckAfterMoveForBoard(boardState, move, color) {
    const tempBoard = copyBoard(boardState);
    tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
    tempBoard[move.from.row][move.from.col] = null;
    return isKingInCheckForBoard(tempBoard, color);
}

function isGameOverState(boardState, color) {
    return isCheckmateForBoard(boardState, color) || isStalemateForBoard(boardState, color);
}

function isCheckmateForBoard(boardState, color) {
    if (!isKingInCheckForBoard(boardState, color)) return false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece.color === color) {
                const moves = getValidMovesForPiece(boardState, row, col, piece);
                if (moves.length > 0) return false;
            }
        }
    }
    
    return true;
}

function isStalemateForBoard(boardState, color) {
    if (isKingInCheckForBoard(boardState, color)) return false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece.color === color) {
                const moves = getValidMovesForPiece(boardState, row, col, piece);
                if (moves.length > 0) return false;
            }
        }
    }
    
    return true;
}

function copyBoard(boardState) {
    return boardState.map(row => row.map(piece => piece ? { ...piece } : null));
}

// Move ordering
function orderMoves(moves, boardState, color) {
    const orderedMoves = [];
    const queenPromotions = [];
    const captures = [];
    const checks = [];
    const kills = [];
    const otherPromotions = [];
    const others = [];
    
    for (const move of moves) {
        const targetPiece = boardState[move.to.row][move.to.col];
        const isCapture = targetPiece !== null;
        const isCheck = wouldGiveCheck(boardState, move, color);
        const isKill = isKillerMove(move);
        const isQueenPromotion = move.promotion === 'queen';
        
        if (isQueenPromotion) {
            queenPromotions.push(move);
        } else if (isKill) {
            kills.push(move);
        } else if (isCheck) {
            checks.push(move);
        } else if (isCapture) {
            captures.push(move);
        } else if (move.promotion) {
            otherPromotions.push(move);
        } else {
            others.push(move);
        }
    }
    
    return [...queenPromotions, ...kills, ...captures, ...checks, ...otherPromotions, ...others];
}

function wouldGiveCheck(boardState, move, color) {
    const tempBoard = copyBoard(boardState);
    tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
    tempBoard[move.from.row][move.from.col] = null;
    
    return isKingInCheckForBoard(tempBoard, switchColor(color));
}

function isKillerMove(move) {
    const centerBonus = (move.to.row >= 2 && move.to.row <= 5 && move.to.col >= 2 && move.to.col <= 5);
    const forwardMove = (move.from.row !== move.to.row);
    
    return centerBonus && forwardMove;
}

// Evaluation function
function evaluateBoard(boardState, color) {
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece.type];
                const positionValue = POSITION_VALUES[piece.type][row][col];
                
                if (piece.color === color) {
                    score += value + positionValue;
                } else {
                    score -= value + positionValue;
                }
            }
        }
    }
    
    const centerBonus = [
        [1, 2, 2, 1],
        [2, 4, 4, 2],
        [2, 4, 4, 2],
        [1, 2, 2, 1]
    ];
    
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const row = i + 2;
            const col = j + 2;
            const piece = boardState[row][col];
            if (piece) {
                if (piece.color === color) {
                    score += centerBonus[i][j] * 15;
                } else {
                    score -= centerBonus[i][j] * 15;
                }
            }
        }
    }
    
    if (isKingInCheckForBoard(boardState, color)) {
        score -= 100;
    }
    
    if (isKingInCheckForBoard(boardState, switchColor(color))) {
        score += 100;
    }
    
    return score;
}

// King position finding
function findKingForBoard(boardState, color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece.type === 'king' && piece.color === color) {
                return { row, col };
            }
        }
    }
    return null;
}

function isKingInCheckForBoard(boardState, color) {
    const kingPos = findKingForBoard(boardState, color);
    if (!kingPos) return false;
    
    const opponentColor = switchColor(color);
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece.color === opponentColor) {
                const moves = getAttackMovesForBoard(boardState, row, col, piece);
                if (moves.some(move => move.to.row === kingPos.row && move.to.col === kingPos.col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function getAttackMovesForBoard(boardState, row, col, piece) {
    let moves = [];
    
    switch (piece.type) {
        case 'pawn':
            const direction = piece.color === 'white' ? -1 : 1;
            moves = [
                { from: { row, col }, to: { row: row + direction, col: col - 1 } },
                { from: { row, col }, to: { row: row + direction, col: col + 1 } }
            ];
            break;
        case 'rook':
            moves = getRookMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'knight':
            moves = getKnightMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'bishop':
            moves = getBishopMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'queen':
            moves = getQueenMovesForBoard(boardState, row, col, piece.color);
            break;
        case 'king':
            moves = getKingMovesForBoard(boardState, row, col, piece.color);
            break;
    }
    
    return moves;
}

// Color switching
function switchColor(color) {
    return color === 'white' ? 'black' : 'white';
}

// Zobrist hashing
function generateZobristHash(boardState) {
    let hash = 0n;
    const zobristTable = self.zobristTable || generateZobristTable();
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece) {
                const pieceIndex = getPieceIndex(piece);
                hash ^= zobristTable[row][col][pieceIndex];
            }
        }
    }
    
    return hash.toString();
}

function generateZobristTable() {
    if (self.zobristTable) return self.zobristTable;
    
    const zobristTable = Array(8).fill().map(() =>
        Array(8).fill().map(() =>
            Array(12).fill().map(() => generateRandomBigInt())
        )
    );
    
    self.zobristTable = zobristTable;
    return zobristTable;
}

function generateRandomBigInt() {
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    let hash = 0n;
    for (let i = 0; i < 8; i++) {
        hash = (hash << 8n) | BigInt(randomBytes[i]);
    }
    return hash;
}

function getPieceIndex(piece) {
    const pieceTypes = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
    const typeIndex = pieceTypes.indexOf(piece.type);
    const colorIndex = piece.color === 'white' ? 0 : 6;
    return typeIndex + colorIndex;
}

// Transposition table
function storeInTT(hash, depth, value, flag, bestMove) {
    transpositionTable.set(hash, {
        depth,
        value,
        flag,
        bestMove,
        age: Date.now()
    });
}

function retrieveFromTT(hash, depth) {
    const entry = transpositionTable.get(hash);
    if (entry && entry.depth >= depth) {
        return entry;
    }
    return null;
}