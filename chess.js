// Chess Game State
let board = [];
let currentPlayer = 'white';
let selectedSquare = null;
let validMoves = [];
let gameHistory = [];
let inCheck = false;
let gameOver = false;
let playerColor = 'white';
let aiColor = 'black';
let difficulty = 2;
let customDepth = 4;
let usePVS = true;
let transpositionTable = new Map();
let nodesSearched = 0;
let pvsCuts = 0;
let pendingPromotion = null;

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

// Initialize the game
function initGame() {
    board = createInitialBoard();
    currentPlayer = 'white';
    selectedSquare = null;
    validMoves = [];
    gameHistory = [];
    inCheck = false;
    gameOver = false;
    
    // Ask player to choose color
    const choice = confirm('Do you want to play as White? (Click OK for White, Cancel for Black)');
    playerColor = choice ? 'white' : 'black';
    aiColor = playerColor === 'white' ? 'black' : 'white';
    
    updatePlayerInfo();
    
    renderBoard();
    updateStatus();
    
    // If AI starts, make the first move
    if (currentPlayer === aiColor) {
        setTimeout(makeAIMove, 500);
    }
}

// Create initial chess board
function createInitialBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Set up pawns
    for (let i = 0; i < 8; i++) {
        board[1][i] = { type: 'pawn', color: 'black' };
        board[6][i] = { type: 'pawn', color: 'white' };
    }
    
    // Set up other pieces
    const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let i = 0; i < 8; i++) {
        board[0][i] = { type: backRank[i], color: 'black' };
        board[7][i] = { type: backRank[i], color: 'white' };
    }
    
    return board;
}

// Render the chess board
function renderBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            if (inCheck && isKingInCheck(currentPlayer)) {
                const kingPos = findKing(currentPlayer);
                if (kingPos && kingPos.row === row && kingPos.col === col) {
                    square.classList.add('in-check');
                }
            }
            
            const piece = board[row][col];
            if (piece) {
                square.innerHTML = getPieceUnicode(piece);
                square.querySelector('.piece').addEventListener('dragstart', handleDragStart);
                square.addEventListener('dragover', handleDragOver);
                square.addEventListener('drop', handleDrop);
            }
            
            square.addEventListener('click', handleSquareClick);
            boardElement.appendChild(square);
        }
    }
}

// Get Unicode character for chess piece
function getPieceUnicode(piece) {
    const unicodeMap = {
        'white': {
            'pawn': '♙',
            'rook': '♖',
            'knight': '♘',
            'bishop': '♗',
            'queen': '♕',
            'king': '♔'
        },
        'black': {
            'pawn': '♟',
            'rook': '♜',
            'knight': '♞',
            'bishop': '♝',
            'queen': '♛',
            'king': '♚'
        }
    };
    
    return `<span class="piece ${piece.type}" draggable="true">${unicodeMap[piece.color][piece.type]}</span>`;
}

// Handle square click
function handleSquareClick(event) {
    if (gameOver || currentPlayer !== playerColor) return;
    
    const square = event.target.closest('.square');
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    
    // If no piece is selected and clicked square has player's piece
    if (!selectedSquare && board[row][col] && board[row][col].color === currentPlayer) {
        selectedSquare = { row, col };
        validMoves = getValidMoves(row, col);
        renderBoard();
        highlightValidMoves();
        return;
    }
    
    // If a piece is already selected
    if (selectedSquare) {
        // If clicking the same piece, deselect it
        if (selectedSquare.row === row && selectedSquare.col === col) {
            selectedSquare = null;
            validMoves = [];
            renderBoard();
            return;
        }
        
        // Check if the move is valid
        const move = validMoves.find(m => m.to.row === row && m.to.col === col);
        if (move) {
            makeMove(move);
            selectedSquare = null;
            validMoves = [];
            
            // Check for game end
            if (isCheckmate(switchColor(currentPlayer))) {
                updateStatus('Checkmate! ' + currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1) + ' wins!');
                gameOver = true;
                return;
            } else if (isStalemate(switchColor(currentPlayer))) {
                updateStatus('Stalemate! The game is a draw.');
                gameOver = true;
                return;
            }
            
            currentPlayer = switchColor(currentPlayer);
            updateTurnIndicator();
            
            // AI's turn
            if (currentPlayer === aiColor) {
                setTimeout(makeAIMove, 500);
            }
        } else if (board[row][col] && board[row][col].color === currentPlayer) {
            // Select a different piece
            selectedSquare = { row, col };
            validMoves = getValidMoves(row, col);
            renderBoard();
            highlightValidMoves();
        } else {
            // Invalid move, keep current selection
            renderBoard();
            highlightValidMoves();
        }
    }
}

// Highlight valid moves
function highlightValidMoves() {
    validMoves.forEach(move => {
        const square = document.querySelector(`.square[data-row="${move.to.row}"][data-col="${move.to.col}"]`);
        if (square) {
            square.classList.add('valid-move');
        }
    });
}

// Get valid moves for a piece
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
    
    // Filter out moves that would put or leave the king in check
    return moves.filter(move => {
        const tempBoard = copyBoard(board);
        tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
        tempBoard[move.from.row][move.from.col] = null;
        
        return !isKingInCheckAfterMove(tempBoard, piece.color);
    });
}

// Pawn moves
function getPawnMoves(row, col, color) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const promotionRow = color === 'white' ? 0 : 7;
    
    // Move forward one square
    if (isInBounds(row + direction, col) && !board[row + direction][col]) {
        const newRow = row + direction;
        if (newRow === promotionRow) {
            // Promotion move - generate all promotion options
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
            
            // Move forward two squares from starting position
            if (row === startRow && !board[row + 2 * direction][col]) {
                moves.push({ from: { row, col }, to: { row: row + 2 * direction, col } });
            }
        }
    }
    
    // Capture diagonally
    const captureOffsets = [{ row: direction, col: -1 }, { row: direction, col: 1 }];
    captureOffsets.forEach(offset => {
        const newRow = row + offset.row;
        const newCol = col + offset.col;
        
        if (isInBounds(newRow, newCol) && board[newRow][newCol] && board[newRow][newCol].color !== color) {
            if (newRow === promotionRow) {
                // Promotion capture - generate all promotion options
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

// Rook moves
function getRookMoves(row, col, color) {
    return getLinearMoves(row, col, color, [
        { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }
    ]);
}

// Bishop moves
function getBishopMoves(row, col, color) {
    return getLinearMoves(row, col, color, [
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 }
    ]);
}

// Queen moves
function getQueenMoves(row, col, color) {
    return getLinearMoves(row, col, color, [
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 },
        { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }
    ]);
}

// Knight moves
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

// King moves
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

// Helper function for linear moves (rook, bishop, queen)
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

// Check if position is within bounds
function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Make a move
function makeMove(move, promotionPiece = null) {
    const { from, to } = move;
    const piece = board[from.row][from.col];
    
    // Save move for history
    const capturedPiece = board[to.row][to.col];
    gameHistory.push({
        move,
        capturedPiece,
        inCheck: inCheck
    });
    
    // Check for pawn promotion
    if (move.promotion) {
        // Promotion move - use the specified promotion piece or default to queen for AI
        const promoPiece = promotionPiece || move.promotion || 'queen';
        board[to.row][to.col] = { type: promoPiece, color: piece.color };
        board[from.row][from.col] = null;
    } else {
        // Regular move
        board[to.row][to.col] = piece;
        board[from.row][from.col] = null;
    }
    
    // Handle player promotion selection
    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7) && !move.promotion) {
        if (currentPlayer === playerColor) {
            // Player needs to choose promotion
            pendingPromotion = { move, color: piece.color };
            showPromotionModal(piece.color);
            return; // Don't continue until promotion is chosen
        } else {
            // AI promotion - always promote to queen for maximum strength
            board[to.row][to.col] = { type: 'queen', color: piece.color };
        }
    }
    
    // Update move history display
    updateMoveHistory(move, capturedPiece);
    
    // Check if king is in check
    inCheck = isKingInCheck(currentPlayer);
    
    renderBoard();
    updateStatus();
}

// AI Move making with PVS or Alpha-Beta depending on settings
function makeAIMove() {
    if (gameOver) return;
    
    const bestMove = findBestMove();
    if (bestMove) {
        makeMove(bestMove);
        
        // Check for game end
        if (isCheckmate(switchColor(currentPlayer))) {
            updateStatus('Checkmate! ' + currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1) + ' wins!');
            gameOver = true;
            return;
        } else if (isStalemate(switchColor(currentPlayer))) {
            updateStatus('Stalemate! The game is a draw.');
            gameOver = true;
            return;
        }
        
        currentPlayer = switchColor(currentPlayer);
        updateTurnIndicator();
    }
}

// Find best move using PVS or Alpha-Beta depending on settings with advanced optimizations
function findBestMove() {
    const currentDepth = usePVS ? customDepth : difficulty;
    const moves = getAllValidMoves(aiColor);
    if (moves.length === 0) return null;
    
    // Order moves for better performance
    const orderedMoves = orderMoves(moves, board, aiColor);
    
    if (usePVS) {
        // Use iterative deepening for better move ordering
        return findBestMoveWithIterativeDeepening(orderedMoves, currentDepth);
    } else {
        return findBestMoveAlphaBeta(orderedMoves, currentDepth);
    }
}

// Find best move with iterative deepening and aspiration windows
function findBestMoveWithIterativeDeepening(moves, maxDepth) {
    let bestMove = moves[0];
    let bestValue = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    nodesSearched = 0;
    pvsCuts = 0;
    
    // Iterative deepening
    for (let depth = 1; depth <= maxDepth; depth++) {
        const hash = generateZobristHash(board);
        
        // Aspiration windows for deeper searches
        let searchAlpha, searchBeta;
        if (depth <= 2) {
            searchAlpha = -Infinity;
            searchBeta = Infinity;
        } else {
            // Narrow window around previous best value
            searchAlpha = bestValue - 25;
            searchBeta = bestValue + 25;
        }
        
        let value;
        try {
            value = pvsSearchWithAspiration(board, depth, false, searchAlpha, searchBeta, aiColor);
        } catch (e) {
            // If aspiration window failed, do full search
            value = pvsSearch(board, depth, false, alpha, beta, aiColor);
        }
        
        if (value > bestValue) {
            bestValue = value;
            // Find the actual best move at this depth
            bestMove = findBestMoveAtDepth(board, depth, aiColor);
        }
        
        // Update aspiration window bounds
        alpha = Math.max(alpha, bestValue);
        
        // Update status with current depth progress
        const performanceInfo = `Depth ${depth}/${maxDepth}, Nodes: ${nodesSearched.toLocaleString()}, PVS cuts: ${pvsCuts.toLocaleString()}`;
        updateStatus(`PVS ${performanceInfo}`);
    }
    
    // Store final result in transposition table
    const finalHash = generateZobristHash(board);
    storeInTT(finalHash, maxDepth, bestValue, 0, bestMove);
    
    return bestMove;
}

// PVS search with aspiration windows
function pvsSearchWithAspiration(boardState, depth, isMaximizing, alpha, beta, color) {
    nodesSearched++;
    
    // Check transposition table
    const hash = generateZobristHash(boardState);
    const ttEntry = retrieveFromTT(hash, depth);
    
    if (ttEntry && ttEntry.flag === 0) { // Exact value
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
            
            // Handle promotion moves in AI search
            if (move.promotion) {
                tempBoard[move.to.row][move.to.col] = { type: move.promotion, color: tempBoard[move.from.row][move.from.col].color };
            } else {
                tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
            }
            tempBoard[move.from.row][move.from.col] = null;
            
            let evaluation;
            
            if (i === 0) {
                // First move: full search
                evaluation = pvsSearch(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
            } else {
                // Subsequent moves: null-window search with aspiration
                evaluation = pvsSearch(tempBoard, depth - 1, false, alpha, alpha + 1, switchColor(color));
                
                // If null-window search suggests this move is better, do full search
                if (evaluation > alpha) {
                    evaluation = pvsSearch(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
                }
            }
            
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, maxEval);
            
            if (beta <= alpha) {
                // Store in TT as lower bound
                storeInTT(hash, depth, alpha, 1, move);
                break;
            }
        }
        
        storeInTT(hash, depth, maxEval, 0, null);
        return maxEval;
    } else {
        let minEval = Infinity;
        
        for (let i = 0; i < orderedMoves.length; i++) {
            const move = orderedMoves[i];
            const tempBoard = copyBoard(boardState);
            
            // Handle promotion moves in AI search
            if (move.promotion) {
                tempBoard[move.to.row][move.to.col] = { type: move.promotion, color: tempBoard[move.from.row][move.from.col].color };
            } else {
                tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
            }
            tempBoard[move.from.row][move.from.col] = null;
            
            let evaluation;
            
            if (i === 0) {
                // First move: full search
                evaluation = pvsSearch(tempBoard, depth - 1, true, alpha, beta, switchColor(color));
            } else {
                // Subsequent moves: null-window search with aspiration
                evaluation = pvsSearch(tempBoard, depth - 1, true, beta - 1, beta, switchColor(color));
                
                // If null-window search suggests this move is better, do full search
                if (evaluation < beta) {
                    evaluation = pvsSearch(tempBoard, depth - 1, true, alpha, beta, switchColor(color));
                }
            }
            
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, minEval);
            
            if (beta <= alpha) {
                // Store in TT as upper bound
                storeInTT(hash, depth, beta, 2, move);
                break;
            }
        }
        
        storeInTT(hash, depth, minEval, 0, null);
        return minEval;
    }
}

// Find best move at specific depth (for iterative deepening)
function findBestMoveAtDepth(boardState, depth, color) {
    const moves = getAllValidMoves(color);
    if (moves.length === 0) return null;
    
    let bestMove = moves[0];
    let bestValue = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    
    const orderedMoves = orderMoves(moves, boardState, color);
    
    for (const move of orderedMoves) {
        const tempBoard = copyBoard(boardState);
        
        // Handle promotion moves
        if (move.promotion) {
            tempBoard[move.to.row][move.to.col] = { type: move.promotion, color: tempBoard[move.from.row][move.from.col].color };
        } else {
            tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
        }
        tempBoard[move.from.row][move.from.col] = null;
        
        const value = pvsSearch(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
        
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
        
        alpha = Math.max(alpha, bestValue);
    }
    
    return bestMove;
}

// Find best move using Principal Variation Search (PVS)
function findBestMovePVS(moves, depth) {
    let bestMove = moves[0];
    let bestValue = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    nodesSearched = 0;
    pvsCuts = 0;
    
    const hash = generateZobristHash(board);
    
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const tempBoard = copyBoard(board);
        tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
        tempBoard[move.from.row][move.from.col] = null;
        
        let value;
        
        if (i === 0) {
            // First move: full-width search
            value = pvsSearch(tempBoard, depth - 1, false, alpha, beta, aiColor);
        } else {
            // Subsequent moves: null-window search
            value = pvsSearch(tempBoard, depth - 1, false, alpha, alpha + 1, aiColor);
            
            // If null-window search suggests this move is better, do full search
            if (value > alpha) {
                value = pvsSearch(tempBoard, depth - 1, false, alpha, beta, aiColor);
            }
        }
        
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
        
        alpha = Math.max(alpha, bestValue);
        
        if (beta <= alpha) {
            pvsCuts++;
            break; // Alpha-beta pruning
        }
    }
    
    // Store in transposition table
    storeInTT(hash, depth, bestValue, 0, bestMove);
    
    // Update status with performance info
    const performanceInfo = `Nodes: ${nodesSearched.toLocaleString()}, PVS cuts: ${pvsCuts.toLocaleString()}`;
    updateStatus(`PVS Depth ${depth} - ${performanceInfo}`);
    
    return bestMove;
}

// Find best move using standard Alpha-Beta (for comparison)
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
            break; // Alpha-beta pruning
        }
    }
    
    updateStatus(`Alpha-Beta Depth ${depth} - Nodes: ${nodesSearched.toLocaleString()}`);
    
    return bestMove;
}

// PVS search algorithm with transposition table
function pvsSearch(boardState, depth, isMaximizing, alpha, beta, color) {
    nodesSearched++;
    
    // Check transposition table
    const hash = generateZobristHash(boardState);
    const ttEntry = retrieveFromTT(hash, depth);
    
    if (ttEntry && ttEntry.flag === 0) { // Exact value
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
            
            // Handle promotion moves in AI search
            if (move.promotion) {
                tempBoard[move.to.row][move.to.col] = { type: move.promotion, color: tempBoard[move.from.row][move.from.col].color };
            } else {
                tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
            }
            tempBoard[move.from.row][move.from.col] = null;
            
            let evaluation;
            
            if (i === 0) {
                // First move: full search
                evaluation = pvsSearch(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
            } else {
                // Subsequent moves: null-window search
                evaluation = pvsSearch(tempBoard, depth - 1, false, alpha, alpha + 1, switchColor(color));
                
                // If null-window search suggests this move is better, do full search
                if (evaluation > alpha) {
                    evaluation = pvsSearch(tempBoard, depth - 1, false, alpha, beta, switchColor(color));
                }
            }
            
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            
            if (beta <= alpha) {
                // Store in TT as lower bound
                storeInTT(hash, depth, alpha, 1, move);
                break;
            }
        }
        
        storeInTT(hash, depth, maxEval, 0, null);
        return maxEval;
    } else {
        let minEval = Infinity;
        
        for (let i = 0; i < orderedMoves.length; i++) {
            const move = orderedMoves[i];
            const tempBoard = copyBoard(boardState);
            
            // Handle promotion moves in AI search
            if (move.promotion) {
                tempBoard[move.to.row][move.to.col] = { type: move.promotion, color: tempBoard[move.from.row][move.from.col].color };
            } else {
                tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
            }
            tempBoard[move.from.row][move.from.col] = null;
            
            let evaluation;
            
            if (i === 0) {
                // First move: full search
                evaluation = pvsSearch(tempBoard, depth - 1, true, alpha, beta, switchColor(color));
            } else {
                // Subsequent moves: null-window search
                evaluation = pvsSearch(tempBoard, depth - 1, true, beta - 1, beta, switchColor(color));
                
                // If null-window search suggests this move is better, do full search
                if (evaluation < beta) {
                    evaluation = pvsSearch(tempBoard, depth - 1, true, alpha, beta, switchColor(color));
                }
            }
            
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            
            if (beta <= alpha) {
                // Store in TT as upper bound
                storeInTT(hash, depth, beta, 2, move);
                break;
            }
        }
        
        storeInTT(hash, depth, minEval, 0, null);
        return minEval;
    }
}

// Get all valid moves for a color
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

// Get all valid moves for a color on a specific board
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

// Get valid moves for a specific piece on a specific board
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

// Check if the game is over in a specific board state
function isGameOverState(boardState, color) {
    return isCheckmateForBoard(boardState, color) || isStalemateForBoard(boardState, color);
}

// Evaluate board position with advanced features for maximum strength
function evaluateBoard(boardState, color) {
    let score = 0;
    
    // Material and positional evaluation
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
    
    // Advanced center control evaluation
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
                    score += centerBonus[i][j] * 15; // Increased bonus for center control
                } else {
                    score -= centerBonus[i][j] * 15;
                }
            }
        }
    }
    
    // Pawn structure evaluation
    score += evaluatePawnStructure(boardState, color) - evaluatePawnStructure(boardState, switchColor(color));
    
    // Piece activity evaluation
    score += evaluatePieceActivity(boardState, color) - evaluatePieceActivity(boardState, switchColor(color));
    
    // King safety evaluation
    score += evaluateKingSafety(boardState, color) - evaluateKingSafety(boardState, switchColor(color));
    
    // Mobility evaluation
    score += evaluateMobility(boardState, color) - evaluateMobility(boardState, switchColor(color));
    
    // Penalty for being in check
    if (isKingInCheckForBoard(boardState, color)) {
        score -= 100; // Increased penalty for being in check
    }
    
    if (isKingInCheckForBoard(boardState, switchColor(color))) {
        score += 100; // Increased bonus for checking opponent
    }
    
    // Endgame evaluation - increase king activity in endgame
    const totalMaterial = calculateTotalMaterial(boardState);
    if (totalMaterial < 1500) { // Endgame threshold
        score += evaluateEndgameKingActivity(boardState, color) - evaluateEndgameKingActivity(boardState, switchColor(color));
    }
    
    return score;
}

// Evaluate pawn structure
function evaluatePawnStructure(boardState, color) {
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece.type === 'pawn' && piece.color === color) {
                // Penalize isolated pawns
                if (isIsolatedPawn(boardState, row, col, color)) {
                    score -= 10;
                }
                
                // Penalize doubled pawns
                if (isDoubledPawn(boardState, row, col, color)) {
                    score -= 5;
                }
                
                // Penalize backward pawns
                if (isBackwardPawn(boardState, row, col, color)) {
                    score -= 8;
                }
                
                // Bonus for passed pawns
                if (isPassedPawn(boardState, row, col, color)) {
                    score += 15 + (color === 'white' ? row * 5 : (7 - row) * 5);
                }
            }
        }
    }
    
    return score;
}

// Check if pawn is isolated
function isIsolatedPawn(boardState, row, col, color) {
    const leftCol = col - 1;
    const rightCol = col + 1;
    const direction = color === 'white' ? -1 : 1;
    
    // Check if there are friendly pawns in adjacent files
    for (let r = 0; r < 8; r++) {
        if (leftCol >= 0 && boardState[r][leftCol] && boardState[r][leftCol].type === 'pawn' && boardState[r][leftCol].color === color) {
            return false;
        }
        if (rightCol < 8 && boardState[r][rightCol] && boardState[r][rightCol].type === 'pawn' && boardState[r][rightCol].color === color) {
            return false;
        }
    }
    
    return true;
}

// Check if pawn is doubled
function isDoubledPawn(boardState, row, col, color) {
    const direction = color === 'white' ? -1 : 1;
    
    // Check if there's another pawn of same color in same file
    for (let r = 0; r < 8; r++) {
        if (r !== row && boardState[r][col] && boardState[r][col].type === 'pawn' && boardState[r][col].color === color) {
            return true;
        }
    }
    
    return false;
}

// Check if pawn is backward
function isBackwardPawn(boardState, row, col, color) {
    const direction = color === 'white' ? -1 : 1;
    const attackRow = row + direction;
    
    // Check if pawn can be attacked by enemy pawns but can't advance safely
    if (attackRow >= 0 && attackRow < 8) {
        const leftCol = col - 1;
        const rightCol = col + 1;
        
        const leftAttack = leftCol >= 0 && boardState[attackRow][leftCol] &&
                          boardState[attackRow][leftCol].type === 'pawn' &&
                          boardState[attackRow][leftCol].color !== color;
        
        const rightAttack = rightCol < 8 && boardState[attackRow][rightCol] &&
                           boardState[attackRow][rightCol].type === 'pawn' &&
                           boardState[attackRow][rightCol].color !== color;
        
        if ((leftAttack || rightAttack) && !canAdvanceSafely(boardState, row, col, color)) {
            return true;
        }
    }
    
    return false;
}

// Check if pawn can advance safely
function canAdvanceSafely(boardState, row, col, color) {
    const direction = color === 'white' ? -1 : 1;
    const nextRow = row + direction;
    
    if (nextRow >= 0 && nextRow < 8 && !boardState[nextRow][col]) {
        // Check if the square is not attacked by enemy pieces
        return !isSquareAttacked(boardState, nextRow, col, switchColor(color));
    }
    
    return false;
}

// Check if pawn is passed
function isPassedPawn(boardState, row, col, color) {
    const direction = color === 'white' ? 1 : -1; // Look ahead in opponent's direction
    const startRow = color === 'white' ? row + 1 : row - 1;
    const endRow = color === 'white' ? 8 : -1;
    
    for (let r = startRow; r !== endRow; r += direction) {
        if (boardState[r][col] && boardState[r][col].type === 'pawn' && boardState[r][col].color !== color) {
            return false;
        }
    }
    
    return true;
}

// Evaluate piece activity
function evaluatePieceActivity(boardState, color) {
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece.color === color && piece.type !== 'king') {
                const mobility = countLegalMoves(boardState, row, col, color);
                score += mobility * 2; // Bonus for piece mobility
            }
        }
    }
    
    return score;
}

// Count legal moves for a piece
function countLegalMoves(boardState, row, col, color) {
    let count = 0;
    const piece = boardState[row][col];
    
    if (!piece) return 0;
    
    switch (piece.type) {
        case 'pawn':
            // Simple mobility count for pawns
            const direction = color === 'white' ? -1 : 1;
            const nextRow = row + direction;
            if (nextRow >= 0 && nextRow < 8 && !boardState[nextRow][col]) {
                count++;
                // Double move from starting position
                const startRow = color === 'white' ? 6 : 1;
                if (row === startRow && !boardState[nextRow + direction][col]) {
                    count++;
                }
            }
            // Captures
            const leftCol = col - 1;
            const rightCol = col + 1;
            if (leftCol >= 0 && nextRow >= 0 && nextRow < 8 &&
                boardState[nextRow][leftCol] && boardState[nextRow][leftCol].color !== color) {
                count++;
            }
            if (rightCol < 8 && nextRow >= 0 && nextRow < 8 &&
                boardState[nextRow][rightCol] && boardState[nextRow][rightCol].color !== color) {
                count++;
            }
            break;
            
        case 'knight':
        case 'bishop':
        case 'rook':
        case 'queen':
            // Use existing move generation functions
            const moves = getMovesForPiece(boardState, row, col, piece);
            count = moves.length;
            break;
    }
    
    return count;
}

// Get moves for a specific piece on a board
function getMovesForPiece(boardState, row, col, piece) {
    switch (piece.type) {
        case 'knight':
            return getKnightMovesForBoard(boardState, row, col, piece.color);
        case 'bishop':
            return getBishopMovesForBoard(boardState, row, col, piece.color);
        case 'rook':
            return getRookMovesForBoard(boardState, row, col, piece.color);
        case 'queen':
            return getQueenMovesForBoard(boardState, row, col, piece.color);
        default:
            return [];
    }
}

// Evaluate king safety
function evaluateKingSafety(boardState, color) {
    let score = 0;
    const kingPos = findKingForBoard(boardState, color);
    
    if (!kingPos) return score;
    
    // Penalize exposed king
    const openFilesNearKing = countOpenFilesNearKing(boardState, kingPos, color);
    score -= openFilesNearKing * 15;
    
    // Bonus for castling
    if (hasCastled(boardState, color)) {
        score += 20;
    }
    
    // Penalize king in center in opening/middlegame
    if (kingPos.row >= 2 && kingPos.row <= 5 && kingPos.col >= 2 && kingPos.col <= 5) {
        score -= 10;
    }
    
    return score;
}

// Count open files near king
function countOpenFilesNearKing(boardState, kingPos, color) {
    let count = 0;
    const kingCol = kingPos.col;
    
    // Check files around king
    for (let colOffset = -2; colOffset <= 2; colOffset++) {
        const checkCol = kingCol + colOffset;
        if (checkCol >= 0 && checkCol < 8) {
            // Check if file is open (no pawns of same color)
            let hasFriendlyPawn = false;
            for (let row = 0; row < 8; row++) {
                const piece = boardState[row][checkCol];
                if (piece && piece.type === 'pawn' && piece.color === color) {
                    hasFriendlyPawn = true;
                    break;
                }
            }
            if (!hasFriendlyPawn) {
                count++;
            }
        }
    }
    
    return count;
}

// Check if side has castled
function hasCastled(boardState, color) {
    const backRank = color === 'white' ? 7 : 0;
    const kingCol = color === 'white' ? 6 : 6; // Check for kingside castling
    const queenCol = color === 'white' ? 2 : 2; // Check for queenside castling
    
    const king = boardState[backRank][kingCol];
    const rookKingside = boardState[backRank][5]; // Rook moved to kingside
    const rookQueenside = boardState[backRank][3]; // Rook moved to queenside
    
    return (king && king.type === 'king' && king.color === color) ||
           (rookKingside && rookKingside.type === 'rook' && rookKingside.color === color) ||
           (rookQueenside && rookQueenside.type === 'rook' && rookQueenside.color === color);
}

// Evaluate mobility
function evaluateMobility(boardState, color) {
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && piece.color === color) {
                const moves = getMovesForPiece(boardState, row, col, piece);
                score += moves.length;
            }
        }
    }
    
    return score;
}

// Evaluate endgame king activity
function evaluateEndgameKingActivity(boardState, color) {
    let score = 0;
    const kingPos = findKingForBoard(boardState, color);
    
    if (kingPos) {
        // In endgame, king should be active and central
        const centerDistance = Math.abs(kingPos.row - 3.5) + Math.abs(kingPos.col - 3.5);
        score += (7 - centerDistance) * 5; // Bonus for central king
    }
    
    return score;
}

// Calculate total material on board
function calculateTotalMaterial(boardState) {
    let total = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece) {
                total += PIECE_VALUES[piece.type];
            }
        }
    }
    
    return total;
}

// Check if square is attacked by enemy pieces
function isSquareAttacked(boardState, row, col, attackerColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece.color === attackerColor) {
                const moves = getAttackMovesForBoard(boardState, r, c, piece);
                if (moves.some(move => move.to.row === row && move.to.col === col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Check if king is in check
function isKingInCheck(color) {
    const kingPos = findKing(color);
    if (!kingPos) return false;
    
    const opponentColor = switchColor(color);
    
    // Check if any opponent piece can attack the king
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === opponentColor) {
                const moves = getAttackMoves(row, col, piece);
                if (moves.some(move => move.to.row === kingPos.row && move.to.col === kingPos.col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Check if king is in check on a specific board
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

// Check if king is in check after a move
function isKingInCheckAfterMove(tempBoard, color) {
    return isKingInCheckForBoard(tempBoard, color);
}

// Check if king is in check after a move for a specific piece
function isKingInCheckAfterMoveForBoard(boardState, move, color) {
    const tempBoard = copyBoard(boardState);
    tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
    tempBoard[move.from.row][move.from.col] = null;
    return isKingInCheckForBoard(tempBoard, color);
}

// Get attack moves (for check detection)
function getAttackMoves(row, col, piece) {
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
    
    return moves;
}

// Get attack moves for a specific board
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

// Find king position
function findKing(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === 'king' && piece.color === color) {
                return { row, col };
            }
        }
    }
    return null;
}

// Find king position on a specific board
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

// Check for checkmate
function isCheckmate(color) {
    if (!isKingInCheck(color)) return false;
    
    // Check if any move can get the king out of check
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const moves = getValidMoves(row, col);
                if (moves.length > 0) return false;
            }
        }
    }
    
    return true;
}

// Check for checkmate on a specific board
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

// Check for stalemate
function isStalemate(color) {
    if (isKingInCheck(color)) return false;
    
    // Check if any move is possible
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const moves = getValidMoves(row, col);
                if (moves.length > 0) return false;
            }
        }
    }
    
    return true;
}

// Check for stalemate on a specific board
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

// Switch color
function switchColor(color) {
    return color === 'white' ? 'black' : 'white';
}

// Copy board
function copyBoard(boardState) {
    return boardState.map(row => row.map(piece => piece ? { ...piece } : null));
}

// Update status
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (message) {
        statusElement.textContent = message;
    } else {
        let status = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1) + "'s turn";
        if (inCheck) {
            status += " - King in check!";
        }
        statusElement.textContent = status;
    }
}

// Update turn indicator
function updateTurnIndicator() {
    const indicator = document.getElementById('turnIndicator');
    indicator.textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1) + "'s Turn";
}

// Update player info
function updatePlayerInfo() {
    document.getElementById('whiteType').textContent = playerColor === 'white' ? 'Human' : 'AI';
    document.getElementById('blackType').textContent = playerColor === 'black' ? 'Human' : 'AI';
}

// Update move history
function updateMoveHistory(move, capturedPiece) {
    const moveList = document.getElementById('moveList');
    const moveNumber = Math.ceil(gameHistory.length / 2);
    const pieceSymbol = getPieceSymbol(move.from);
    const captureSymbol = capturedPiece ? 'x' : '';
    const square = String.fromCharCode(97 + move.to.col) + (8 - move.to.row);
    
    const moveText = `${pieceSymbol}${captureSymbol}${square}`;
    
    let moveItem = moveList.querySelector(`.move-item[data-move-number="${moveNumber}"]`);
    
    if (!moveItem) {
        moveItem = document.createElement('div');
        moveItem.className = 'move-item';
        moveItem.dataset.moveNumber = moveNumber;
        moveItem.innerHTML = `<span>${moveNumber}.</span><span></span>`;
        moveList.appendChild(moveItem);
    }
    
    if (currentPlayer === 'black') {
        moveItem.querySelector('span:last-child').textContent = moveText;
    } else {
        moveItem.querySelector('span:nth-child(2)').textContent = moveText;
    }
}

// Get piece symbol for notation
function getPieceSymbol(position) {
    const piece = board[position.row][position.col];
    if (!piece) return '';
    
    switch (piece.type) {
        case 'pawn': return '';
        case 'knight': return 'N';
        case 'bishop': return 'B';
        case 'rook': return 'R';
        case 'queen': return 'Q';
        case 'king': return 'K';
        default: return '';
    }
}

// Pawn moves for specific board
function getPawnMovesForBoard(boardState, row, col, color) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const promotionRow = color === 'white' ? 0 : 7;
    
    if (isInBounds(row + direction, col) && !boardState[row + direction][col]) {
        const newRow = row + direction;
        if (newRow === promotionRow) {
            // Promotion move - generate all promotion options
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
                // Promotion capture - generate all promotion options
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

// Rook moves for specific board
function getRookMovesForBoard(boardState, row, col, color) {
    return getLinearMovesForBoard(boardState, row, col, color, [
        { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }
    ]);
}

// Bishop moves for specific board
function getBishopMovesForBoard(boardState, row, col, color) {
    return getLinearMovesForBoard(boardState, row, col, color, [
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 }
    ]);
}

// Queen moves for specific board
function getQueenMovesForBoard(boardState, row, col, color) {
    return getLinearMovesForBoard(boardState, row, col, color, [
        { row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 },
        { row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }
    ]);
}

// Knight moves for specific board
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

// King moves for specific board
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

// Linear moves for specific board
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

// Drag and drop handlers
function handleDragStart(e) {
    const square = e.target.closest('.square');
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    
    if (board[row][col] && board[row][col].color === currentPlayer && currentPlayer === playerColor) {
        selectedSquare = { row, col };
        validMoves = getValidMoves(row, col);
        square.classList.add('dragging');
        e.dataTransfer.setData('text/plain', JSON.stringify({ row, col }));
    } else {
        e.preventDefault();
    }
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const square = e.target.closest('.square');
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    
    if (selectedSquare) {
        const move = validMoves.find(m => m.to.row === row && m.to.col === col);
        if (move) {
            makeMove(move);
            selectedSquare = null;
            validMoves = [];
            
            if (isCheckmate(switchColor(currentPlayer))) {
                updateStatus('Checkmate! ' + currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1) + ' wins!');
                gameOver = true;
                return;
            } else if (isStalemate(switchColor(currentPlayer))) {
                updateStatus('Stalemate! The game is a draw.');
                gameOver = true;
                return;
            }
            
            currentPlayer = switchColor(currentPlayer);
            updateTurnIndicator();
            
            if (currentPlayer === aiColor) {
                setTimeout(makeAIMove, 500);
            }
        }
    }
    
    // Remove dragging class
    const draggingSquare = document.querySelector('.square.dragging');
    if (draggingSquare) {
        draggingSquare.classList.remove('dragging');
    }
}

// Event listeners
document.getElementById('newGameBtn').addEventListener('click', initGame);
document.getElementById('undoBtn').addEventListener('click', () => {
    if (gameHistory.length > 0) {
        undoLastMove();
        renderBoard();
        updateStatus();
    }
});
document.getElementById('difficulty').addEventListener('change', (e) => {
    difficulty = parseInt(e.target.value);
});
document.getElementById('applySettingsBtn').addEventListener('click', applySettings);
document.getElementById('usePVS').addEventListener('change', (e) => {
    usePVS = e.target.checked;
});

// Undo last move
function undoLastMove() {
    if (gameHistory.length === 0) return;
    
    const lastMove = gameHistory.pop();
    const { from, to } = lastMove.move;
    
    // Restore the board
    board[from.row][from.col] = board[to.row][to.col];
    board[to.row][to.col] = lastMove.capturedPiece;
    
    // Update current player
    currentPlayer = switchColor(currentPlayer);
    updateTurnIndicator();
    
    // Remove from move history display
    const moveList = document.getElementById('moveList');
    const items = moveList.querySelectorAll('.move-item');
    if (items.length > 0) {
        const lastItem = items[items.length - 1];
        if (lastItem.querySelector('span:nth-child(2)').textContent === '') {
            lastItem.remove();
        } else {
            lastItem.querySelector('span:last-child').textContent = '';
        }
    }
    
    gameOver = false;
    inCheck = lastMove.inCheck;
}

// Apply settings function
function applySettings() {
    const customDepthInput = document.getElementById('customDepth');
    const customDepthValue = parseInt(customDepthInput.value);
    
    // Validate custom depth (1-10 range for performance)
    if (customDepthValue >= 1 && customDepthValue <= 10) {
        customDepth = customDepthValue;
        difficulty = customDepthValue;
    } else {
        alert('Custom depth must be between 1 and 10');
        customDepthInput.value = customDepth;
    }
    
    usePVS = document.getElementById('usePVS').checked;
    
    // Clear transposition table when settings change
    transpositionTable.clear();
    nodesSearched = 0;
    pvsCuts = 0;
    
    updateStatus(`Settings applied: Depth=${customDepth}, PVS=${usePVS ? 'ON' : 'OFF'}`);
}

// Generate Zobrist hash for board position
function generateZobristHash(boardState) {
    let hash = 0n;
    const zobristTable = window.zobristTable || generateZobristTable();
    
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

// Generate Zobrist table for hashing
function generateZobristTable() {
    if (window.zobristTable) return window.zobristTable;
    
    const zobristTable = Array(8).fill().map(() =>
        Array(8).fill().map(() =>
            Array(12).fill().map(() => generateRandomBigInt())
        )
    );
    
    window.zobristTable = zobristTable;
    return zobristTable;
}

// Generate random BigInt for Zobrist hashing
function generateRandomBigInt() {
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    let hash = 0n;
    for (let i = 0; i < 8; i++) {
        hash = (hash << 8n) | BigInt(randomBytes[i]);
    }
    return hash;
}

// Get piece index for Zobrist hashing
function getPieceIndex(piece) {
    const pieceTypes = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
    const typeIndex = pieceTypes.indexOf(piece.type);
    const colorIndex = piece.color === 'white' ? 0 : 6;
    return typeIndex + colorIndex;
}

// Store position in transposition table
function storeInTT(hash, depth, value, flag, bestMove) {
    transpositionTable.set(hash, {
        depth,
        value,
        flag, // 0 = exact, 1 = lower bound, 2 = upper bound
        bestMove,
        age: Date.now()
    });
}

// Retrieve position from transposition table
function retrieveFromTT(hash, depth) {
    const entry = transpositionTable.get(hash);
    if (entry && entry.depth >= depth) {
        return entry;
    }
    return null;
}

// Move ordering for better PVS performance
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
    
    // Order: queen promotions, killers, captures, checks, other promotions, others
    return [...queenPromotions, ...kills, ...captures, ...checks, ...otherPromotions, ...others];
}

// Check if move would give check
function wouldGiveCheck(boardState, move, color) {
    const tempBoard = copyBoard(boardState);
    tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
    tempBoard[move.from.row][move.from.col] = null;
    
    return isKingInCheckForBoard(tempBoard, switchColor(color));
}

// Check if move is a killer move (simple heuristic)
function isKillerMove(move) {
    // Simple heuristic: prioritize center control and piece development
    const centerBonus = (move.to.row >= 2 && move.to.row <= 5 && move.to.col >= 2 && move.to.col <= 5);
    const forwardMove = (move.from.row !== move.to.row); // Not a lateral move
    
    return centerBonus && forwardMove;
}

// Show promotion modal for player
function showPromotionModal(color) {
    const modal = document.getElementById('promotionModal');
    const options = document.getElementById('promotionOptions');
    
    // Clear previous options
    options.innerHTML = '';
    
    const promotionPieces = ['queen', 'rook', 'bishop', 'knight'];
    const unicodeMap = color === 'white' ?
        { queen: '♕', rook: '♖', bishop: '♗', knight: '♘' } :
        { queen: '♛', rook: '♜', bishop: '♝', knight: '♞' };
    
    promotionPieces.forEach(pieceType => {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'promotion-piece';
        pieceElement.textContent = unicodeMap[pieceType];
        pieceElement.dataset.piece = pieceType;
        pieceElement.addEventListener('click', () => {
            selectPromotion(pieceType);
        });
        options.appendChild(pieceElement);
    });
    
    modal.style.display = 'flex';
}

// Handle promotion selection
function selectPromotion(pieceType) {
    const modal = document.getElementById('promotionModal');
    modal.style.display = 'none';
    
    if (pendingPromotion) {
        const { move, color } = pendingPromotion;
        
        // Complete the move with promotion
        board[move.to.row][move.to.col] = { type: pieceType, color: color };
        
        // Update move history with promotion notation
        const capturedPiece = gameHistory[gameHistory.length - 1].capturedPiece;
        const moveNumber = Math.ceil(gameHistory.length / 2);
        const pieceSymbol = pieceType === 'pawn' ? '' : pieceType.charAt(0).toUpperCase();
        const captureSymbol = capturedPiece ? 'x' : '';
        const square = String.fromCharCode(97 + move.to.col) + (8 - move.to.row);
        const promotionNotation = `=${pieceType.charAt(0).toUpperCase()}`;
        
        let moveItem = document.querySelector(`.move-item[data-move-number="${moveNumber}"]`);
        if (!moveItem) {
            moveItem = document.createElement('div');
            moveItem.className = 'move-item';
            moveItem.dataset.moveNumber = moveNumber;
            moveItem.innerHTML = `<span>${moveNumber}.</span><span></span>`;
            document.getElementById('moveList').appendChild(moveItem);
        }
        
        if (currentPlayer === 'black') {
            moveItem.querySelector('span:last-child').textContent = `${pieceSymbol}${captureSymbol}${square}${promotionNotation}`;
        } else {
            moveItem.querySelector('span:nth-child(2)').textContent = `${pieceSymbol}${captureSymbol}${square}${promotionNotation}`;
        }
        
        // Check if king is in check
        inCheck = isKingInCheck(currentPlayer);
        
        renderBoard();
        updateStatus();
        
        // Check for game end
        if (isCheckmate(switchColor(currentPlayer))) {
            updateStatus('Checkmate! ' + currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1) + ' wins!');
            gameOver = true;
            return;
        } else if (isStalemate(switchColor(currentPlayer))) {
            updateStatus('Stalemate! The game is a draw.');
            gameOver = true;
            return;
        }
        
        currentPlayer = switchColor(currentPlayer);
        updateTurnIndicator();
        
        // AI's turn
        if (currentPlayer === aiColor) {
            setTimeout(makeAIMove, 500);
        }
        
        pendingPromotion = null;
    }
}

// Handle click outside modal to close it
window.addEventListener('click', (event) => {
    const modal = document.getElementById('promotionModal');
    if (event.target === modal) {
        modal.style.display = 'none';
        if (pendingPromotion) {
            // If player closes modal without choosing, default to queen
            selectPromotion('queen');
        }
    }
});

// Initialize the game when page loads
window.addEventListener('load', initGame);