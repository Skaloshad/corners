let deskWidth;
let deskHeight;
let gCanvas;
let gContext;
let gGridCoords;
let turnCountElement;
let messageElement;

let turnCount = 0;
let goalsComplete = false;
let message = "";


const DrawType = Object.freeze({
   STROKE: 1,
   FILL: 2,
   ERASE: 3
})

function createGameElement( selector, { width = 200, height = 200 }) {
   let container = document.querySelector(selector);
   let canvas = document.createElement("canvas");
   let restartBtn = document.createElement("button");
   messageElement = document.createElement("p");
   restartBtn.innerText = "restart";
   restartBtn.onclick = restart;
   turnCountElement = document.createElement("div");
   turnCountElement.innerHTML = 0;
   deskWidth = width;
   deskHeight = height;
   canvas.width = width;
   canvas.height = height;
   container.appendChild(canvas);
   container.appendChild(turnCountElement);
   container.appendChild(restartBtn);
   container.appendChild(messageElement);
   return canvas;
}

function clickHandler( event ) {
   if (!goalsComplete) {
      let rX = event.x - event.srcElement.offsetLeft;
      let rY = event.y - event.srcElement.offsetTop;

      let cell = getCellByClick(rX, rY, gGridCoords);
      let selectedCell = gGridCoords.cells.flat()
            .filter(cell => cell.checker)
            .find(checker => checker.checker.isSelected);
      if (cell.checker) {
         if (!cell.checker.isSelected && !enySelected(gGridCoords)) {
            select(gContext, gGridCoords, cell)
            showInTouchCells(gContext, gGridCoords, getInTouchCells(cell));
         } else if (someCell(selectedCell, cell)) {
            hideInTouchCells(gContext, gGridCoords)
            unselect(gContext, gGridCoords, cell)
         } else {
            hideInTouchCells(gContext, gGridCoords)
            unselect(gContext, gGridCoords, selectedCell)
            select(gContext, gGridCoords, cell)
            showInTouchCells(gContext, gGridCoords, getInTouchCells(cell));
         }
      } else {
         if (selectedCell && isInTouchCell(selectedCell, cell)) {
            hideInTouchCells(gContext, gGridCoords);
            move(gContext, gGridCoords, selectedCell, cell);         
         }
      }
   }
}

function showInTouchCells(context, grid, cells) {
   for(cell of cells) {
      context.beginPath();
      context.fillStyle = "green";
      context.fillRect( cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2 );
      context.closePath();
   }
}

function hideInTouchCells(context, grid) {
   grid.cells.flat().forEach(cell => {
      if (cell.checker) {
         delete cell.lighted;
      }
   })
   grid.cells.flat().forEach(cell => {
      if (cell.lighted) {
         context.clearRect(cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2) 
         delete cell.lighted;
      }
   })
   
}

function checkGoal() {
   let cols = gGridCoords.cols.length - 1;
   let goalCells = [
      { row: 0, col: cols - 1 },
      { row: 0, col: cols - 2 },
      { row: 0, col: cols - 3 },
      { row: 1, col: cols - 1 },
      { row: 1, col: cols - 2 },
      { row: 1, col: cols - 3 },
      { row: 2, col: cols - 1 },
      { row: 2, col: cols - 2 },
      { row: 2, col: cols - 3 }
   ];
   return getAllCheckerCells().every(cell => {
      return goalCells.some(goalCell => {
         return someCell(cell, goalCell)
      });
   })
}

function getAllCheckerCells() {
   return gGridCoords.cells.flat().filter(cell => cell.checker);
}

function getArea(selectedCell, cells) {
   return cells.flat().filter(cell => {
      if(selectedCell.row == cell.row && selectedCell.col == cell.col) return false;
      if(((selectedCell.row - cell.row) < -1)
       || ((selectedCell.row - cell.row) > 1)
       || ((selectedCell.col - cell.col) < -1)
       || ((selectedCell.col - cell.col) > 1)) {
         return false;
      }
      return true;
   })
}

function getInTouchCells(selectedCell) {
   let inTouchCells = [];
   let cells = gGridCoords.cells;
   cells.flat().forEach(cell => delete cell.additionalCell);

   inTouchCells = cells.flat().filter(cell => {
      if(cell.checker) return false;
      if(((selectedCell.row - cell.row) < -1)
       || ((selectedCell.row - cell.row) > 1)
       || ((selectedCell.col - cell.col) < -1)
       || ((selectedCell.col - cell.col) > 1)) {
         return false;
      }
      return true;
   })

   let area = getArea(selectedCell, cells);
   let additionalCells = [];
   area.filter(cell => cell.checker).forEach(cell => {
      let c = jumpEnd(selectedCell, cell);
      try {
         if(cells[c.row][c.col].checker) {

         } else {
            cells[c.row][c.col].additionalCell = true;
            additionalCells.push(cells[c.row][c.col]);
         }
      } catch { }
   })

   inTouchCells.push(...additionalCells)
   inTouchCells.forEach(cell => gGridCoords.cells[cell.row][cell.col].lighted = true);
   return inTouchCells;
}

function isInTouchCell(selectedCell, targetCell) {
   let inTouchCells = getInTouchCells(selectedCell);
   return inTouchCells.some(cell => cell.row == targetCell.row && cell.col == targetCell.col);
}

function someCell(selectedCell, targetCell) {
   return selectedCell.row == targetCell.row && selectedCell.col == targetCell.col;
}

function jumpEnd(jCell, overCell) {
   let res = {}
   if (jCell.row == overCell.row) {
      if (jCell.col < overCell.col) {
         res.row = jCell.row;
         res.col = jCell.col + 2;
      } else if (jCell.col > overCell.col) {
         res.row = jCell.row;
         res.col = jCell.col - 2;
      }
   } else if (jCell.col == overCell.col) {
      if (jCell.row < overCell.row) {
         res.row = jCell.row + 2;
         res.col = jCell.col;
      } else if (jCell.row > overCell.row) {
         res.row = jCell.row - 2;
         res.col = jCell.col;
      }
   } else {
      if (jCell.row < overCell.row && jCell.col < overCell.col) {
         res.row = jCell.row + 2;
         res.col = jCell.col + 2;
      } else if (jCell.row > overCell.row && jCell.col < overCell.col) {
         res.row = jCell.row - 2;
         res.col = jCell.col + 2;
      } else if (jCell.row > overCell.row && jCell.col > overCell.col) {
         res.row = jCell.row - 2;
         res.col = jCell.col - 2;
      } else {
         res.row = jCell.row + 2;
         res.col = jCell.col - 2;
      }
   }

   return res;
}

function enySelected(grid) {
   let isSomeSelected = grid.cells.flat()
      .filter(cell => cell.checker)
      .some(checker => checker.checker.isSelected);
   return isSomeSelected;
}

function select(context, grid, cell) {
   drawСhecker(context, grid, cell.row, cell.col, DrawType.ERASE)
   drawСhecker(context, grid, cell.row, cell.col, DrawType.FILL)
}

function unselect(context, grid, cell) {
   drawСhecker(context, grid, cell.row, cell.col, DrawType.ERASE)
   drawСhecker(context, grid, cell.row, cell.col, DrawType.STROKE)
}

function clearAdditional() {
   gGridCoords.cells.forEach(cell => delete cell.additionalCell)
}

function renderTurnCount() {
   turnCountElement.innerHTML = turnCount;
}

function incTurn() {
   turnCount++;
   renderTurnCount();
}

function move(context, grid, cellFrom, cellTo) {

   let inTouchCells = getInTouchCells(cellFrom);
   let additionalCells = inTouchCells.filter(cell => cell.additionalCell);
   let isAdditional = additionalCells.some(cell => someCell(cell, cellTo));

   if(isAdditional) {
      drawСhecker(context, grid, cellFrom.row, cellFrom.col, DrawType.ERASE);
      drawСhecker(context, grid, cellTo.row, cellTo.col, DrawType.FILL);
      showInTouchCells(gContext, gGridCoords, getInTouchCells(cellTo));
   } else {
      drawСhecker(context, grid, cellFrom.row, cellFrom.col, DrawType.ERASE);
      drawСhecker(context, grid, cellTo.row, cellTo.col, DrawType.STROKE);
      incTurn()
   }
   if (checkGoal()) {
      message = "Вы выиграли!!!!!!!";
      messageElement.innerText = message;
      goalsComplete = true;
   };
}

function draw( context, gridCoords ) {
   drawGrid(context, gridCoords);
   drawInitCheckers(context, gridCoords);
}

function drawGrid( context, gridCoords ) {
   context.strokeStyle = "#eee";

   for(let row = 0; row < gridCoords.rows.length; row++) {
      context.moveTo(gridCoords.rows[row].begin.x, gridCoords.rows[row].begin.y);
      context.lineTo(gridCoords.rows[row].end.x, gridCoords.rows[row].end.y);
   }

   for(let col = 0; col < gridCoords.cols.length; col++) {
      context.moveTo(gridCoords.cols[col].begin.x, gridCoords.cols[col].begin.y);
      context.lineTo(gridCoords.cols[col].end.x, gridCoords.cols[col].end.y);
   }
   context.stroke();
}

function drawСhecker( context, grid, row, col, type = DrawType.STROKE ) {
   let cell = grid.cells[row][col];
   let radius = Math.min(cell.width, cell.height)/2 - 5;
   let center = {
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2
   }

   context.beginPath();
   context.arc( center.x, center.y, radius, 0, Math.PI*2, false );
   context.closePath();

   if (type == DrawType.STROKE) {
      grid.cells[row][col].checker = {
         isSelected: false
      };
      context.strokeStyle = "#000";
      context.stroke();
   } else if (type == DrawType.FILL) {
      grid.cells[row][col].checker = {
         isSelected: true
      };
      context.fillStyle = "#000";
      context.fill();
   } else if (type == DrawType.ERASE) {
      delete grid.cells[row][col].checker;
      context.clearRect(cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2);
   }
   
}

function drawInitCheckers(context, gridCoords) {
   let rows = gridCoords.rows.length;
   let cols = gridCoords.cols.length;

   drawСhecker(context, gridCoords, rows - 2, 0);
   drawСhecker(context, gridCoords, rows - 2, 1);
   drawСhecker(context, gridCoords, rows - 2, 2);
   drawСhecker(context, gridCoords, rows - 3, 0);
   drawСhecker(context, gridCoords, rows - 3, 1);
   drawСhecker(context, gridCoords, rows - 3, 2);
   drawСhecker(context, gridCoords, rows - 4, 0);
   drawСhecker(context, gridCoords, rows - 4, 1);
   drawСhecker(context, gridCoords, rows - 4, 2);
}

function getGridCoords( rows, cols, width, height ) {
   let rowHeight = height / rows;
   let colWidth = width / cols;
   let rowsCoords = [];
   let colsCoords = [];
   let cells = [];
   
   for (let row = 0; row < rows + 1; row++) {
      rowsCoords.push({
         begin: {
            x: 0,
            y: row * rowHeight
         },
         end: {
            x: width,
            y: row * rowHeight
         }
      })
   }
   for (let col = 0; col < cols + 1; col++) {
      colsCoords.push({
         begin: {
            x: col * colWidth,
            y: 0
         },
         end: {
            x: col * colWidth,
            y: height
         }
      })
   }
   for (let i = 0; i < rows; i++) {
      let cellRow = [];
      for (let j = 0; j < cols; j++) {
         cellRow.push({
            row: i,
            col: j,
            x: j * colWidth, 
            y: i * rowHeight, 
            width: colWidth, 
            height: rowHeight
         })
      }
      cells.push(cellRow);
   }
   return {
      rows: rowsCoords,
      cols: colsCoords,
      cells: cells
   };
}

function getCellByClick(x, y, grid) {
   return grid.cells.flat().find(function(el) {
      return ((el.x < x) && (el.x + el.width > x)) 
         && ((el.y < y) && (el.y + el.height > y))
   })
}

function init( selector ) {
   let canvas = createGameElement( selector, {
      width: 500,
      height: 500
   })
   
   gCanvas = canvas;
   let context = canvas.getContext("2d");
   gContext = context;
   canvas.addEventListener('click', clickHandler);
   let gridCoords = getGridCoords( 4, 4, deskWidth, deskHeight );
   gGridCoords = gridCoords;
   draw(context, gridCoords);
}

function restart() {
   gCanvas.width = gCanvas.width;
   let gridCoords = getGridCoords( 4, 4, deskWidth, deskHeight );
   gGridCoords = gridCoords;
   draw(gContext, gGridCoords);
   turnCount = 0;
   renderTurnCount();
   message = "";
   messageElement.innerText = message;
   goalsComplete = false;
}

window.game = {};
window.game.init = init;
window.game.restart = restart;