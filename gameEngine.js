"use strict";

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      this.init(8,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }
    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED) {
              this.arr[r][c].state = STATE_HIDDEN;
              this.nmarked--;
              $(`#${r}_${c}`).css("background-color", "green");
          }
            
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
    }
    uncover(row, col) {
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0)
        this.sprinkleMines(row, col);
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        $(`#${r}_${c}`).css("background-color", "yellowgreen");
        $(`#${r}_${c}`).addClass("flipped");
        if (this.arr[r][c].count !== 0 && !this.arr[r][c].mine) $(`#${r}_${c}`).append(`<span>${this.arr[r][c].count.toString()}</span>`);
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }
    mark(row, col) {
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s += "M";
          else if( a.state === STATE_HIDDEN) s += "H";
          else if( a.state === STATE_MARKED) s += "F";
          else if( a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }
      return res;
    }
    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }
  }

  return _MSGame;

})();

let clickSound = new Audio("clunk.mp3");
let uiSelection = "Easy";

//begin ui components
function generateGrid(game) {
    /* ensure there are no leftover div elements before generation */
    $(".grid").children().remove();
    $(".grid").css("grid-template-columns", `repeat(${game.ncols}, 1fr)`);
    for (let i = 0; i < game.nrows; i++) {
        for (let j = 0; j < game.ncols; j++) {
            const card = document.createElement("div");
            card.className = "card";
            card.id = `${i}_${j}`;
            $(".grid").append(card);
        }
    }
}

let myTimer;

function updateCallbacks(game) {
    $(".card").click(function() {
        const strs = $(this).attr("id").split('_');
        const canUncover = game.uncover(Number(strs[0].trim()),Number(strs[1].trim()));
        if (canUncover) {
            clickSound.play();
            updateFlags(game);
            if (game.exploded) {
                $(this).css("background-color", "red");
                $("#overlayin").html('<p class="big glow">You Lost</p><p class="darker">Click anywhere to start a new game.</p>');
                $('#overlay').toggleClass("active");
                clearInterval(myTimer);
            }
            else if (game.nuncovered + game.nmines === game.nrows*game.ncols) {
                $("#overlayin").html('<p class="big glow">Congratulations, you won!!!</p><p class="darker">Click anywhere to start a new game.</p>');
                $('#overlay').toggleClass("active");
                clearInterval(myTimer);
            }
        }
    });
    if ($(window).width() < 420) {
        $(".card").on("taphold", function(event) {
            event.preventDefault();
            event.stopPropagation();
            const strs = $(this).attr("id").split('_');
            const validSelection = game.mark(strs[0],strs[1]);
            if (validSelection) {
                updateFlags(game);
                if (game.arr[strs[0]][strs[1]].state == "marked") {
                    $(this).css("background-color", "orange");
                }
                else if (game.arr[strs[0]][strs[1]].state == "hidden") {
                    $(this).css("background-color", "green");
                }
                $(this).toggleClass("flipped");
            }
          })
    }
    else {
        $(".card").contextmenu(function(event) {
            event.preventDefault();
            const strs = $(this).attr("id").split('_');
            const validSelection = game.mark(strs[0],strs[1]);
            if (validSelection) {
                updateFlags(game);
                if (game.arr[strs[0]][strs[1]].state == "marked") {
                    $(this).css("background-color", "orange");
                }
                else if (game.arr[strs[0]][strs[1]].state == "hidden") {
                    $(this).css("background-color", "green");
                }
                $(this).toggleClass("flipped");
            }
        })
    }
    $('#overlay').click(function() {
        if (uiSelection === "Medium") {
            game.init(14, 18, 40);
        }
        else {
            game.init(8, 10, 10);
        }
        generateGrid(game);
        updateFlags(game);
        updateCallbacks(game);
        $('#overlay').removeClass("active");
        updateCallbacks(game);
        myTimer = runTime();
    })
}

function updateFlags(game) {
    $(".flag span").html(game.nmines - game.nmarked);
}

let game = new MSGame();


$(".menuButton").each( function() {
  $(this).on("click", function(event) {
    $(this).css("background-color", "darkgray");
    const buttonVal = $(this).attr("data-size");
    if (buttonVal === 'Easy') {
      $("#Medium").css("background-color", "rgba(128, 128, 128, 0.233)");
        uiSelection = buttonVal;
        game.init(8, 10, 10);
        generateGrid(game);
        updateFlags(game);
        updateCallbacks(game);
        clearInterval(myTimer);
        myTimer = runTime();
    }
    else if (buttonVal === 'Medium') {
      $("#Easy").css("background-color", "rgba(128, 128, 128, 0.233)");
        uiSelection = buttonVal;
        game.init(14, 18, 40);
        generateGrid(game);
        updateFlags(game);
        updateCallbacks(game);
        clearInterval(myTimer);
        myTimer = runTime();
    }
  })
});

//default easy
game.init(8, 10, 10);


generateGrid(game);
updateCallbacks(game);

$(window).on("throttledresize", () => {
    updateCallbacks(game);
})


$("#sound").change(function() {
    clickSound.volume = $(this)[0].checked ? 0 : 1;
});

function runTime() {
  let sec = 0;
  $("#time").text("00:00");
  return setInterval( () => {
    sec++;
    let min = parseInt(sec/60); 
    $("#time").text(`${min >= 10 ? min : "0"+min}:${sec%60 >= 10 ? sec%60 : "0"+sec%60}`);
  }, 1000)
}

$(document).ready(function () {
  myTimer = runTime();
});
