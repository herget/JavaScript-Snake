/*
Retro Snake

Forked. First version by Patrick Gillespie - I've since merged in a good number of github pull requests
http://patorjk.com/games/snake 
*/

/**
* @module Snake
* @class SNAKE
*/

var SNAKE = SNAKE || {};
window.SNAKE = SNAKE; // this will allow us to access the game in other JS files when the app is loaded up in a codesandbox.com sandbox, that's the only reason it's here

/**
* @method addEventListener
* @param {Object} obj The object to add an event listener to.
* @param {String} event The event to listen for.
* @param {Function} funct The function to execute when the event is triggered.
* @param {Boolean} evtCapturing True to do event capturing, false to do event bubbling.
*/
SNAKE.addEventListener = (function() {
    if (window.addEventListener) {
        return function(obj, event, funct, evtCapturing) {
            obj.addEventListener(event, funct, evtCapturing);
        };
    } else if (window.attachEvent) {
        return function(obj, event, funct) {
            obj.attachEvent("on" + event, funct);
        };
    }
})();

/**
* @method removeEventListener
* @param {Object} obj The object to remove an event listener from.
* @param {String} event The event that was listened for.
* @param {Function} funct The function that was executed when the event is triggered.
* @param {Boolean} evtCapturing True if event capturing was done, false otherwise.
*/

SNAKE.removeEventListener = (function() {
    if (window.removeEventListener) {
        return function(obj, event, funct, evtCapturing) {
            obj.removeEventListener(event, funct, evtCapturing);
        };
    } else if (window.detachEvent) {
        return function(obj, event, funct) {
            obj.detachEvent("on" + event, funct);
        };
    }
})();

/**
* This class manages the snake which will reside inside of a SNAKE.Board object.
* @class Snake
* @constructor
* @namespace SNAKE
* @param {Object} config The configuration object for the class. Contains playingBoard (the SNAKE.Board that this snake resides in), startRow and startCol.
*/
SNAKE.Snake = SNAKE.Snake || (function() {

    // -------------------------------------------------------------------------
    // Private static variables and methods
    // -------------------------------------------------------------------------

    var instanceNumber = 0;
    var blockPool = [];

    var SnakeBlock = function() {
        this.elm = null;
        this.elmStyle = null;
        this.row = -1;
        this.col = -1;
        this.xPos = -1000;
        this.yPos = -1000;
        this.next = null;
        this.prev = null;
    };

    // this function is adapted from the example at http://greengeckodesign.com/blog/2007/07/get-highest-z-index-in-javascript.html
    function getNextHighestZIndex(myObj) {
        var highestIndex = 0,
            currentIndex = 0,
            ii;
        for (ii in myObj) {
            if (myObj[ii].elm.currentStyle){
                currentIndex = parseFloat(myObj[ii].elm.style["z-index"],10);
            }else if(window.getComputedStyle) {
                currentIndex = parseFloat(document.defaultView.getComputedStyle(myObj[ii].elm,null).getPropertyValue("z-index"),10);
            }
            if(!isNaN(currentIndex) && currentIndex > highestIndex){
                highestIndex = currentIndex;
            }
        }
        return(highestIndex+1);
    }

    // -------------------------------------------------------------------------
    // Contructor + public and private definitions
    // -------------------------------------------------------------------------

    /*
        config options:
            playingBoard - the SnakeBoard that this snake belongs too.
            startRow - The row the snake should start on.
            startCol - The column the snake should start on.
    */
    return function(config) {

        if (!config||!config.playingBoard) {return;}
        if (localStorage.jsSnakeHighScore === undefined) localStorage.setItem('jsSnakeHighScore', 0);

        // ----- private variables -----

        var me = this,
            playingBoard = config.playingBoard,
            myId = instanceNumber++,
            growthIncr = 5,
            lastMove = 1,
            preMove = -1,
            isFirstMove = true,
            isFirstGameMove = true,
            currentDirection = -1, // 0: up, 1: left, 2: down, 3: right
            columnShift = [0, 1, 0, -1],
            rowShift = [-1, 0, 1, 0],
            xPosShift = [],
            yPosShift = [],
            snakeSpeed = 80,
            isDead = false,
            isPaused = false;

            function setModeListener (mode, speed) {
                document.getElementById(mode).addEventListener('click', function () { snakeSpeed = speed; });
            }

            var modeDropdown = document.getElementById('selectMode');
            if ( modeDropdown ) {
                modeDropdown.addEventListener('change', function(evt) {
                    evt = evt || {};
                    var val = evt.target ? parseInt(evt.target.value) : 75;
                    
                    if (isNaN(val)) {
                        val = 75;
                    } else if (val < 50) {
                        val = 75
                    }

                    snakeSpeed = val;

                    setTimeout(function() {
                        document.getElementById('game-area').focus();
                    }, 10);
                });
            }

            //setModeListener('Easy', 100);
            //setModeListener('Medium', 75);
            //setModeListener('Difficult', 50);

        // ----- public variables -----
        me.snakeBody = {};
        me.snakeBody["b0"] = new SnakeBlock(); // create snake head
        me.snakeBody["b0"].row = config.startRow || 1;
        me.snakeBody["b0"].col = config.startCol || 1;
        me.snakeBody["b0"].xPos = me.snakeBody["b0"].row * playingBoard.getBlockWidth();
        me.snakeBody["b0"].yPos = me.snakeBody["b0"].col * playingBoard.getBlockHeight();
        me.snakeBody["b0"].elm = createSnakeElement();
        me.snakeBody["b0"].elmStyle = me.snakeBody["b0"].elm.style;
        playingBoard.getBoardContainer().appendChild( me.snakeBody["b0"].elm );
        me.snakeBody["b0"].elm.style.left = me.snakeBody["b0"].xPos + "px";
        me.snakeBody["b0"].elm.style.top = me.snakeBody["b0"].yPos + "px";
        me.snakeBody["b0"].next = me.snakeBody["b0"];
        me.snakeBody["b0"].prev = me.snakeBody["b0"];

        me.snakeLength = 1;
        me.snakeHead = me.snakeBody["b0"];
        me.snakeTail = me.snakeBody["b0"];
        me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'');
        me.snakeHead.elm.className += " snake-snakebody-alive";

        // ----- private methods -----

        function createSnakeElement() {
            var tempNode = document.createElement("div");
            tempNode.className = "snake-snakebody-block";
            tempNode.style.left = "-1000px";
            tempNode.style.top = "-1000px";
            tempNode.style.width = playingBoard.getBlockWidth() + "px";
            tempNode.style.height = playingBoard.getBlockHeight() + "px";
            return tempNode;
        }

        function createBlocks(num) {
            var tempBlock;
            var tempNode = createSnakeElement();

            for (var ii = 1; ii < num; ii++){
                tempBlock = new SnakeBlock();
                tempBlock.elm = tempNode.cloneNode(true);
                tempBlock.elmStyle = tempBlock.elm.style;
                playingBoard.getBoardContainer().appendChild( tempBlock.elm );
                blockPool[blockPool.length] = tempBlock;
            }

            tempBlock = new SnakeBlock();
            tempBlock.elm = tempNode;
            playingBoard.getBoardContainer().appendChild( tempBlock.elm );
            blockPool[blockPool.length] = tempBlock;
        }

        function recordScore() {
            var highScore = localStorage.jsSnakeHighScore;
            if (me.snakeLength > highScore) {
                alert('Congratulations! You have beaten your previous high score, which was ' + highScore + '.');
                localStorage.setItem('jsSnakeHighScore', me.snakeLength);
            }
        }

        function handleEndCondition(handleFunc) {
            recordScore();
            me.snakeHead.elm.style.zIndex = getNextHighestZIndex(me.snakeBody);
            me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-alive\b/, '')
            me.snakeHead.elm.className += " snake-snakebody-dead";

            isDead = true;
            handleFunc();
        }

        // ----- public methods -----

        me.setPaused = function(val) {
            isPaused = val;
        };
        me.getPaused = function() {
            return isPaused;
        };

        /**
        * This method is called when a user presses a key. It logs arrow key presses in "currentDirection", which is used when the snake needs to make its next move.
        * @method handleArrowKeys
        * @param {Number} keyNum A number representing the key that was pressed.
        */
        /*
            Handles what happens when an arrow key is pressed.
            Direction explained (0 = up, etc etc)
                    0
                  3   1
                    2
        */
        me.handleArrowKeys = function(keyNum) {
            if (isDead || isPaused) {return;}

            var snakeLength = me.snakeLength;

            //console.log("lastmove="+lastMove);
            //console.log("dir="+keyNum);

            let directionFound = -1;

            switch (keyNum) {
                case 37:
                case 65:
                    directionFound = 3;
                    break;
                case 38:
                case 87:
                    directionFound = 0;
                    break;
                case 39:
                case 68:
                    directionFound = 1;
                    break;
                case 40:
                case 83:
                    directionFound = 2;
                    break;
            }
            if (currentDirection !== lastMove)  // Allow a queue of 1 premove so you can turn again before the first turn registers
            {
                preMove = directionFound;
            }
            if (Math.abs(directionFound - lastMove) !== 2 && isFirstMove || isFirstGameMove)  // Prevent snake from turning 180 degrees
            {
                currentDirection = directionFound;
                isFirstMove = false;
                isFirstGameMove = false;
            }
        };

        /**
        * This method is executed for each move of the snake. It determines where the snake will go and what will happen to it. This method needs to run quickly.
        * @method go
        */
        me.go = function() {

            var oldHead = me.snakeHead,
                newHead = me.snakeTail,
                grid = playingBoard.grid; // cache grid for quicker lookup

            if (isPaused === true) {
                setTimeout(function(){me.go();}, snakeSpeed);
                return;
            }

            me.snakeTail = newHead.prev;
            me.snakeHead = newHead;

            // clear the old board position
            if ( grid[newHead.row] && grid[newHead.row][newHead.col] ) {
                grid[newHead.row][newHead.col] = 0;
            }

            if (currentDirection !== -1){
                lastMove = currentDirection;
                if (preMove !== -1)  // If the user queued up another move after the current one
                {
                    currentDirection = preMove;  // Execute that move next time (unless overwritten)
                    preMove = -1;
                }
            }
            isFirstMove = true;
            
            newHead.col = oldHead.col + columnShift[lastMove];
            newHead.row = oldHead.row + rowShift[lastMove];
            newHead.xPos = oldHead.xPos + xPosShift[lastMove];
            newHead.yPos = oldHead.yPos + yPosShift[lastMove];
            
            if ( !newHead.elmStyle ) {
                newHead.elmStyle = newHead.elm.style;
            }
            
            newHead.elmStyle.left = newHead.xPos + "px";
            newHead.elmStyle.top = newHead.yPos + "px";
            newHead.elm.classList.remove("snake-snakebody-block", "snake-snakebody-alive")
            oldHead.elm.classList.add("snake-snakebody-block", "snake-snakebody-alive")
            
            // Set head pos
            var headImage = document.getElementById("snakehead")
            var headImageWidth = headImage.getBoundingClientRect().width
            var headImageHeight = headImage.getBoundingClientRect().height
            var headImageWidthCenter = headImageWidth/2 - playingBoard.getBlockWidth()/2
            var headImageHeightCenter = headImageHeight/2 - playingBoard.getBlockHeight()/2
            var direction = currentDirection != -1 ? currentDirection : lastMove
            switch(direction) {
                case 0: { // UP
                    headImage.style.transform = "rotate(180deg)"; 
                    headImage.style.left = (newHead.xPos - headImageWidthCenter) + "px"
                    headImage.style.top = (newHead.yPos - headImageHeightCenter) + "px"
                    break;
                }
                case 1: { // RIGHT
                    headImage.style.transform = "rotate(270deg)"; 
                    headImage.style.left = newHead.xPos + "px"
                    headImage.style.top = (newHead.yPos - headImageHeightCenter) + "px"
                    break;
                }
                case 2: { // DOWN
                    headImage.style.transform = ""; 
                    headImage.style.left = (newHead.xPos - headImageWidthCenter) + "px"
                    headImage.style.top = newHead.yPos + "px"
                    break;
                }
                case 3: { // LEFT
                    headImage.style.transform = "rotate(90deg)"; 
                    headImage.style.left = (newHead.xPos - headImageWidthCenter) + "px"
                    headImage.style.top = (newHead.yPos - headImageHeightCenter) + "px"
                    break;
                }
            }

            // check the new spot the snake moved into

            if (grid[newHead.row][newHead.col] === 0) {
                grid[newHead.row][newHead.col] = 1;
                setTimeout(function(){me.go();}, snakeSpeed);
            } else if (grid[newHead.row][newHead.col] > 0) {
                me.handleDeath();
            } else if (grid[newHead.row][newHead.col] === playingBoard.getGridFoodValue()) {
                grid[newHead.row][newHead.col] = 1;
                if (!me.eatFood()) {
                    me.handleWin();
                    return;
                }
                setTimeout(function(){me.go();}, snakeSpeed);
            }
        };

        /**
        * This method is called when it is determined that the snake has eaten some food.
        * @method eatFood
        * @return {bool} Whether a new food was able to spawn (true)
        *   or not (false) after the snake eats food.
        */
        me.eatFood = function() {
            if (blockPool.length <= growthIncr) {
                createBlocks(growthIncr*2);
            }
            var blocks = blockPool.splice(0, growthIncr);

            var ii = blocks.length,
                index,
                prevNode = me.snakeTail;
            while (ii--) {
                index = "b" + me.snakeLength++;
                me.snakeBody[index] = blocks[ii];
                me.snakeBody[index].prev = prevNode;
                me.snakeBody[index].elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
                me.snakeBody[index].elm.className += " snake-snakebody-alive";
                prevNode.next = me.snakeBody[index];
                prevNode = me.snakeBody[index];
            }
            me.snakeTail = me.snakeBody[index];
            me.snakeTail.next = me.snakeHead;
            me.snakeHead.prev = me.snakeTail;

            if (!playingBoard.foodEaten()) {
                return false;
            }

            return true;
        };

        /**
        * This method handles what happens when the snake dies.
        * @method handleDeath
        */
        me.handleDeath = function() {
            handleEndCondition(playingBoard.handleDeath);
        };

        /**
        * This method handles what happens when the snake wins.
        * @method handleDeath
        */
        me.handleWin = function() {
            handleEndCondition(playingBoard.handleWin);
        };

        /**
        * This method sets a flag that lets the snake be alive again.
        * @method rebirth
        */
        me.rebirth = function() {
            isDead = false;
            isFirstMove = true;
            isFirstGameMove = true;
            preMove = -1;
            me.eatFood()
        };

        /**
        * This method reset the snake so it is ready for a new game.
        * @method reset
        */
        me.reset = function() {
            if (isDead === false) {return;}

            var blocks = [],
                curNode = me.snakeHead.next,
                nextNode;
            while (curNode !== me.snakeHead) {
                nextNode = curNode.next;
                curNode.prev = null;
                curNode.next = null;
                blocks.push(curNode);
                curNode = nextNode;
            }
            me.snakeHead.next = me.snakeHead;
            me.snakeHead.prev = me.snakeHead;
            me.snakeTail = me.snakeHead;
            me.snakeLength = 1;

            for (var ii = 0; ii < blocks.length; ii++) {
                blocks[ii].elm.style.left = "-1000px";
                blocks[ii].elm.style.top = "-1000px";
                blocks[ii].elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
                blocks[ii].elm.className += " snake-snakebody-alive";
            }

            blockPool.concat(blocks);
            me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
            me.snakeHead.elm.className += " snake-snakebody-alive";
            me.snakeHead.row = config.startRow || 1;
            me.snakeHead.col = config.startCol || 1;
            me.snakeHead.xPos = me.snakeHead.row * playingBoard.getBlockWidth();
            me.snakeHead.yPos = me.snakeHead.col * playingBoard.getBlockHeight();
            me.snakeHead.elm.style.left = me.snakeHead.xPos + "px";
            me.snakeHead.elm.style.top = me.snakeHead.yPos + "px";
            
        };

        // ---------------------------------------------------------------------
        // Initialize
        // ---------------------------------------------------------------------
        createBlocks(growthIncr*2);
        xPosShift[0] = 0;
        xPosShift[1] = playingBoard.getBlockWidth();
        xPosShift[2] = 0;
        xPosShift[3] = -1 * playingBoard.getBlockWidth();

        yPosShift[0] = -1 * playingBoard.getBlockHeight();
        yPosShift[1] = 0;
        yPosShift[2] = playingBoard.getBlockHeight();
        yPosShift[3] = 0;
    };
})();

/**
* This class manages the food which the snake will eat.
* @class Food
* @constructor
* @namespace SNAKE
* @param {Object} config The configuration object for the class. Contains playingBoard (the SNAKE.Board that this food resides in).
*/

SNAKE.Food = SNAKE.Food || (function() {

    // -------------------------------------------------------------------------
    // Private static variables and methods
    // -------------------------------------------------------------------------

    var instanceNumber = 0;

    function getRandomPosition(x, y){
        return Math.floor(Math.random()*(y+1-x)) + x;
    }

    // -------------------------------------------------------------------------
    // Contructor + public and private definitions
    // -------------------------------------------------------------------------

    /*
        config options:
            playingBoard - the SnakeBoard that this object belongs too.
    */
    return function(config) {

        if (!config||!config.playingBoard) {return;}

        // ----- private variables -----

        var me = this;
        var playingBoard = config.playingBoard;
        var fRow, fColumn;
        var myId = instanceNumber++;

        var elmFood = document.createElement("div");
        elmFood.setAttribute("id", "snake-food-"+myId);
        elmFood.className = "snake-food-block";
        elmFood.style.width = playingBoard.getBlockWidth() + "px";
        elmFood.style.height = playingBoard.getBlockHeight() + "px";
        elmFood.style.left = "-1000px";
        elmFood.style.top = "-1000px";
        playingBoard.getBoardContainer().appendChild(elmFood);

        // ----- public methods -----

        /**
        * @method getFoodElement
        * @return {DOM Element} The div the represents the food.
        */
        me.getFoodElement = function() {
            return elmFood;
        };

        /**
        * Randomly places the food onto an available location on the playing board.
        * @method randomlyPlaceFood
        * @return {bool} Whether a food was able to spawn (true) or not (false).
        */
        me.randomlyPlaceFood = function() {
            // if there exist some food, clear its presence from the board
            if (playingBoard.grid[fRow] && playingBoard.grid[fRow][fColumn] === playingBoard.getGridFoodValue()){
                playingBoard.grid[fRow][fColumn] = 0;
            }

            var row = 0, col = 0, numTries = 0;

            var maxRows = playingBoard.grid.length-1;
            var maxCols = playingBoard.grid[0].length-1;

            while (playingBoard.grid[row][col] !== 0){
                row = getRandomPosition(1, maxRows);
                col = getRandomPosition(1, maxCols);

                // in some cases there may not be any room to put food anywhere
                // instead of freezing, exit out (and return false to indicate
                // that the player beat the game)
                numTries++;
                if (numTries > 20000){
                    return false;
                }
            }

            playingBoard.grid[row][col] = playingBoard.getGridFoodValue();
            fRow = row;
            fColumn = col;
            elmFood.style.top = row * playingBoard.getBlockHeight() + "px";
            elmFood.style.left = col * playingBoard.getBlockWidth() + "px";
            return true;
        };
    };
})();

/**
* This class manages playing board for the game.
* @class Board
* @constructor
* @namespace SNAKE
* @param {Object} config The configuration object for the class. Set fullScreen equal to true if you want the game to take up the full screen, otherwise, set the top, left, width and height parameters.
*/

SNAKE.Board = SNAKE.Board || (function() {

    // -------------------------------------------------------------------------
    // Private static variables and methods
    // -------------------------------------------------------------------------

    var instanceNumber = 0;

    // this function is adapted from the example at http://greengeckodesign.com/blog/2007/07/get-highest-z-index-in-javascript.html
    function getNextHighestZIndex(myObj) {
        var highestIndex = 0,
            currentIndex = 0,
            ii;
        for (ii in myObj) {
            if (myObj[ii].elm.currentStyle){
                currentIndex = parseFloat(myObj[ii].elm.style["z-index"],10);
            }else if(window.getComputedStyle) {
                currentIndex = parseFloat(document.defaultView.getComputedStyle(myObj[ii].elm,null).getPropertyValue("z-index"),10);
            }
            if(!isNaN(currentIndex) && currentIndex > highestIndex){
                highestIndex = currentIndex;
            }
        }
        return(highestIndex+1);
    }

    /*
        This function returns the width of the available screen real estate that we have
    */
    function getClientWidth(){
        var myWidth = 0;
        if( typeof window.innerWidth === "number" ) {
            myWidth = window.innerWidth;//Non-IE
        } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
            myWidth = document.documentElement.clientWidth;//IE 6+ in 'standards compliant mode'
        } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
            myWidth = document.body.clientWidth;//IE 4 compatible
        }
        return myWidth;
    }
    /*
        This function returns the height of the available screen real estate that we have
    */
    function getClientHeight(){
        var myHeight = 0;
        if( typeof window.innerHeight === "number" ) {
            myHeight = window.innerHeight;//Non-IE
        } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
            myHeight = document.documentElement.clientHeight;//IE 6+ in 'standards compliant mode'
        } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
            myHeight = document.body.clientHeight;//IE 4 compatible
        }
        return myHeight;
    }

    // -------------------------------------------------------------------------
    // Contructor + public and private definitions
    // -------------------------------------------------------------------------

    return function(inputConfig) {

        // --- private variables ---
        var me = this,
            myId = instanceNumber++,
            config = inputConfig || {},
            MAX_BOARD_COLS = 250,
            MAX_BOARD_ROWS = 250,
            blockWidth = 10,
            blockHeight = 10,
            GRID_FOOD_VALUE = -1, // the value of a spot on the board that represents snake food, MUST BE NEGATIVE
            myFood,
            mySnake,
            boardState = 1, // 0: in active; 1: awaiting game start; 2: playing game
            myKeyListener,
            isPaused = false,//note: both the board and the snake can be paused
            // Board components
            elmContainer, elmPlayingField, elmAboutPanel, elmLengthPanel, elmHighscorePanel, elmWelcome, elmTryAgain, elmWin, elmPauseScreen;

        // --- public variables ---
        me.grid = [];

        // ---------------------------------------------------------------------
        // private functions
        // ---------------------------------------------------------------------

        function createBoardElements() {
            elmPlayingField = document.createElement("div");
            elmPlayingField.setAttribute("id", "playingField");
            elmPlayingField.className = "snake-playing-field";

            SNAKE.addEventListener(elmPlayingField, "click", function() {
                elmContainer.focus();
            }, false);

            elmPauseScreen = document.createElement("div");
            elmPauseScreen.className = "modal-wrapper";
            elmPauseScreen.innerHTML = "<div class='modal'><div class='snake-pause-screen'><div>[Paused]</div> <p>Press [space] to unpause.</p></div></div>";

            elmLengthPanel = document.createElement("div");
            elmLengthPanel.className = "snake-panel-component";
            elmLengthPanel.innerHTML = "Length: 1";

            elmHighscorePanel = document.createElement("div");
            elmHighscorePanel.className = "snake-panel-component";
            elmHighscorePanel.innerHTML = "Highscore: " + (localStorage.jsSnakeHighScore || 0);

            elmWelcome = createWelcomeElement();
            elmTryAgain = createTryAgainElement();
            elmWin = createWinElement();

            SNAKE.addEventListener( elmContainer, "keyup", function(evt) {
                if (!evt) var evt = window.event;
                evt.cancelBubble = true;
                if (evt.stopPropagation) {evt.stopPropagation();}
                if (evt.preventDefault) {evt.preventDefault();}
                return false;
            }, false);

            elmContainer.className = "snake-game-container";

            elmFooter = document.querySelector(".snake-footer")
            elmFooter.appendChild(elmLengthPanel);
            // elmFooter.appendChild(elmHighscorePanel);

            elmContainer.appendChild(elmPauseScreen);
            elmContainer.appendChild(elmPlayingField);
            elmContainer.appendChild(elmWelcome);
            elmContainer.appendChild(elmTryAgain);
            elmContainer.appendChild(elmWin);

            mySnake = new SNAKE.Snake({playingBoard:me,startRow:20,startCol:20});
            myFood = new SNAKE.Food({playingBoard: me});

            elmWelcome.style.display = "block"

            // Set up gestures using HammerJS
            var hammer    = new Hammer.Manager(elmContainer);
            var swipe     = new Hammer.Swipe();
            var startGameOrMoveInDirection = function (keyNum) {
                if(boardState === 1) {
                    mySnake.rebirth();
                    mySnake.handleArrowKeys(keyNum);
                    me.setBoardState(2); // start the game!
                    mySnake.go();
                } else {
                    mySnake.handleArrowKeys(keyNum);
                }
            }

            hammer.add(swipe);

            hammer.on('swipeleft', function(){
                startGameOrMoveInDirection(37)
            });
            
            hammer.on('swiperight', function(){
                startGameOrMoveInDirection(39)
            });

            hammer.on('swipeup', function(){
                startGameOrMoveInDirection(38)
            });

            hammer.on('swipedown', function(){
                startGameOrMoveInDirection(40)
            });
        }
        function maxBoardWidth() {
            return MAX_BOARD_COLS * me.getBlockWidth();
        }
        function maxBoardHeight() {
            return MAX_BOARD_ROWS * me.getBlockHeight();
        }

        function createWelcomeElement() {
             var tmpElm = document.createElement("div");
            tmpElm.id = "sbWelcome" + myId;
            tmpElm.className = "modal-wrapper";

            var welcomeTxt = document.createElement("div");
            welcomeTxt.className = "modal";
            var fullScreenText = "";
            if (config.fullScreen) {
                fullScreenText = "On Windows, press F11 to play in Full Screen mode.";
            }
            welcomeTxt.innerHTML = '<div class="snake-welcome-dialog"><h1>Retro Snake</h1><p class="instructions">Swipe <svg viewBox="0 0 24 24" height="24" width="24" focusable="false" role="img" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="StyledIconBase-ea9ulj-0 bWRyML"><title>Swipe icon</title><rect width="16" height="16" fill="none"></rect><path d="M18.89 14.75l-4.09-2.04c-.28-.14-.58-.21-.89-.21H13v-6c0-.83-.67-1.5-1.5-1.5S10 5.67 10 6.5v10.74l-3.25-.74a.99.99 0 00-.92.28l-.83.84 4.54 4.79c.38.38 1.14.59 1.67.59h6.16c1 0 1.84-.73 1.98-1.72l.63-4.46c.12-.85-.32-1.68-1.09-2.07z"></path><path d="M20.13 3.87C18.69 2.17 15.6 1 12 1S5.31 2.17 3.87 3.87L2 2v5h5L4.93 4.93c1-1.29 3.7-2.43 7.07-2.43s6.07 1.14 7.07 2.43L17 7h5V2l-1.87 1.87z"></path></svg> or use the <strong>arrow keys </strong><svg viewBox="0 0 16 16" height="20" width="20" focusable="false" role="img" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="StyledIconBase-ea9ulj-0 bWRyML"><title>ArrowRightSquareFill icon</title><path d="M0 14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v12zm4.5-6.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5a.5.5 0 0 1 0-1z"></path></svg> on your keyboard to play the game.</p></div>';
            var welcomeStart = document.createElement("button");
            welcomeStart.appendChild(document.createTextNode("Play Game"));
            var loadGame = function() {
                SNAKE.removeEventListener(window, "keyup", kbShortcut, false);
                tmpElm.style.display = "none";
                me.setBoardState(1);
                me.getBoardContainer().focus();
            };

            var kbShortcut = function(evt) {
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;
                if (keyNum === 32 || keyNum === 13) {
                    loadGame();
                }
            };
            SNAKE.addEventListener(window, "keyup", kbShortcut, false);
            SNAKE.addEventListener(welcomeStart, "click", loadGame, false);

            welcomeTxt.appendChild(welcomeStart);
            tmpElm.appendChild(welcomeTxt);
            return tmpElm;
        }

        function createGameEndElement(message, elmId, elmClassName) {
            var tmpElm = document.createElement("div");
            tmpElm.id = elmId + myId;
            tmpElm.className = "modal-wrapper";

            var gameEndTxt = document.createElement("div");
            gameEndTxt.className = "modal"
            gameEndTxt.innerHTML = "<div class='" + elmClassName + "'>Retro Snake <p>" + message + "</p></div>";
            var gameEndStart = document.createElement("button");
            gameEndStart.appendChild(document.createTextNode("Play Again?"));

            var reloadGame = function () {
                tmpElm.style.display = "none";
                me.resetBoard();
                me.setBoardState(1);
                me.getBoardContainer().focus();
            };

            var kbGameEndShortcut = function (evt) {
                if (boardState !== 0 || tmpElm.style.display !== "block") { return; }
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;
                if (keyNum === 32 || keyNum === 13) {
                    reloadGame();
                }
            };
            SNAKE.addEventListener(window, "keyup", kbGameEndShortcut, true);

            SNAKE.addEventListener(gameEndStart, "click", reloadGame, false);
            gameEndTxt.appendChild(gameEndStart);
            tmpElm.appendChild(gameEndTxt);
            return tmpElm;
        }

        function createTryAgainElement() {
            return createGameEndElement("You died :(", "sbTryAgain", "snake-try-again-dialog");
        }

        function createWinElement() {
            return createGameEndElement("You win! :D", "sbWin", "snake-win-dialog");
        }

        function handleEndCondition(elmDialog) {
            var index = Math.max(getNextHighestZIndex(mySnake.snakeBody), getNextHighestZIndex({ tmp: { elm: myFood.getFoodElement() } }));
            elmContainer.removeChild(elmDialog);
            elmContainer.appendChild(elmDialog);
            // elmDialog.style.zIndex = index;
            elmDialog.style.display = "block";
            me.setBoardState(0);
        }

        // ---------------------------------------------------------------------
        // public functions
        // ---------------------------------------------------------------------

        me.setPaused = function(val) {
            isPaused = val;
            mySnake.setPaused(val);
            if (isPaused) {
                elmPauseScreen.style.display = "block";
            } else {
                elmPauseScreen.style.display = "none";
            }
        };
        me.getPaused = function() {
            return isPaused;
        };

        /**
        * Resets the playing board for a new game.
        * @method resetBoard
        */
        me.resetBoard = function() {
            SNAKE.removeEventListener(elmContainer, "keydown", myKeyListener, false);
            mySnake.reset();
            elmLengthPanel.innerHTML = "Length: 1";
            me.setupPlayingField();
        };
        /**
        * Gets the current state of the playing board. There are 3 states: 0 - Welcome or Try Again dialog is present. 1 - User has pressed "Start Game" on the Welcome or Try Again dialog but has not pressed an arrow key to move the snake. 2 - The game is in progress and the snake is moving.
        * @method getBoardState
        * @return {Number} The state of the board.
        */
        me.getBoardState = function() {
            return boardState;
        };
        /**
        * Sets the current state of the playing board. There are 3 states: 0 - Welcome or Try Again dialog is present. 1 - User has pressed "Start Game" on the Welcome or Try Again dialog but has not pressed an arrow key to move the snake. 2 - The game is in progress and the snake is moving.
        * @method setBoardState
        * @param {Number} state The state of the board.
        */
        me.setBoardState = function(state) {
            boardState = state;
        };
        /**
        * @method getGridFoodValue
        * @return {Number} A number that represents food on a number representation of the playing board.
        */
        me.getGridFoodValue = function() {
            return GRID_FOOD_VALUE;
        };
        /**
        * @method getPlayingFieldElement
        * @return {DOM Element} The div representing the playing field (this is where the snake can move).
        */
        me.getPlayingFieldElement = function() {
            return elmPlayingField;
        };
        /**
        * @method setBoardContainer
        * @param {DOM Element or String} myContainer Sets the container element for the game.
        */
        me.setBoardContainer = function(myContainer) {
            if (typeof myContainer === "string") {
                myContainer = document.getElementById(myContainer);
            }
            if (myContainer === elmContainer) {return;}
            elmContainer = myContainer;
            elmPlayingField = null;

            me.setupPlayingField();
        };
        /**
        * @method getBoardContainer
        * @return {DOM Element}
        */
        me.getBoardContainer = function() {
            return elmContainer;
        };
        /**
        * @method getBlockWidth
        * @return {Number}
        */
        me.getBlockWidth = function() {
            return blockWidth;
        };
        /**
        * @method getBlockHeight
        * @return {Number}
        */
        me.getBlockHeight = function() {
            return blockHeight;
        };
        /**
        * Sets up the playing field.
        * @method setupPlayingField
        */
        me.setupPlayingField = function () {

            if (!elmPlayingField) {createBoardElements();} // create playing field

            // calculate width of our game container
            var cWidth, cHeight;
            var cTop, cLeft;
            if (config.fullScreen === true) {
                cTop = 0;
                cLeft = 0;
                cWidth = getClientWidth();
                cHeight = getClientHeight();
                
            } else {
                cTop = config.top;
                cLeft = config.left;
                cWidth = config.width;
                cHeight = config.height;
            }

            // define the dimensions of the board and playing field
            var wEdgeSpace = me.getBlockWidth() + (cWidth % me.getBlockWidth());
            var fWidth = Math.min(maxBoardWidth()-wEdgeSpace,cWidth-wEdgeSpace);
            var hEdgeSpace = me.getBlockHeight() + (cHeight % me.getBlockHeight());
            var fHeight = Math.min(maxBoardHeight()-hEdgeSpace,cHeight-hEdgeSpace);

            elmPlayingField.style.left = me.getBlockWidth() + "px";
            elmPlayingField.style.top  = me.getBlockHeight() + "px";
            elmPlayingField.style.width = fWidth + "px";
            elmPlayingField.style.height = fHeight + "px";

            // the math for this will need to change depending on font size, padding, etc
            // assuming height of 14 (font size) + 8 (padding)
            var bottomPanelHeight = hEdgeSpace - me.getBlockHeight();
            var pLabelTop = me.getBlockHeight() + fHeight + Math.round((bottomPanelHeight - 30)/2) + "px";

            me.grid = [];
            var numBoardCols = fWidth / me.getBlockWidth() + 2;
            var numBoardRows = fHeight / me.getBlockHeight() + 2;

            for (var row = 0; row < numBoardRows; row++) {
                me.grid[row] = [];
                for (var col = 0; col < numBoardCols; col++) {
                    if (col === 0 || row === 0 || col === (numBoardCols-1) || row === (numBoardRows-1)) {
                        me.grid[row][col] = 1; // an edge
                    } else {
                        me.grid[row][col] = 0; // empty space
                    }
                }
            }

            myFood.randomlyPlaceFood();

            myKeyListener = function(evt) {
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;

                if (me.getBoardState() === 1) {
                    if ( !(keyNum >= 37 && keyNum <= 40) && !(keyNum === 87 || keyNum === 65 || keyNum === 83 || keyNum === 68)) {return;} // if not an arrow key, leave

                    // This removes the listener added at the #listenerX line
                    SNAKE.removeEventListener(elmContainer, "keydown", myKeyListener, false);

                    myKeyListener = function(evt) {
                        if (!evt) var evt = window.event;
                        var keyNum = (evt.which) ? evt.which : evt.keyCode;

                        //console.log(keyNum);
                        if (keyNum === 32) {
							if(me.getBoardState()!=0)
                                me.setPaused(!me.getPaused());
                        }

                        mySnake.handleArrowKeys(keyNum);

                        evt.cancelBubble = true;
                        if (evt.stopPropagation) {evt.stopPropagation();}
                        if (evt.preventDefault) {evt.preventDefault();}
                        return false;
                    };
                    SNAKE.addEventListener( elmContainer, "keydown", myKeyListener, false);

                    mySnake.rebirth();
                    mySnake.handleArrowKeys(keyNum);
                    me.setBoardState(2); // start the game!
                    mySnake.go();
                }

                evt.cancelBubble = true;
                if (evt.stopPropagation) {evt.stopPropagation();}
                if (evt.preventDefault) {evt.preventDefault();}
                return false;
            };

            // Search for #listenerX to see where this is removed
            SNAKE.addEventListener( elmContainer, "keydown", myKeyListener, false);
        };

        /**
        * This method is called when the snake has eaten some food.
        * @method foodEaten
        * @return {bool} Whether a new food was able to spawn (true)
        *   or not (false) after the snake eats food.
        */
        me.foodEaten = function() {
            elmLengthPanel.innerHTML = "Length: " + mySnake.snakeLength;
            if (mySnake.snakeLength > localStorage.jsSnakeHighScore)
            {
                localStorage.setItem("jsSnakeHighScore", mySnake.snakeLength);
                elmHighscorePanel.innerHTML = "Highscore: " + localStorage.jsSnakeHighScore;
            }
            if (!myFood.randomlyPlaceFood()) {
                return false;
            }
            return true;
        };

        /**
        * This method is called when the snake dies.
        * @method handleDeath
        */
        me.handleDeath = function() {
            handleEndCondition(elmTryAgain);
        };

        /**
        * This method is called when the snake wins.
        * @method handleWin
        */
        me.handleWin = function () {
            handleEndCondition(elmWin);
        };

        // ---------------------------------------------------------------------
        // Initialize
        // ---------------------------------------------------------------------

        config.fullScreen = (typeof config.fullScreen === "undefined") ? false : config.fullScreen;
        config.top = (typeof config.top === "undefined") ? 0 : config.top;
        config.left = (typeof config.left === "undefined") ? 0 : config.left;
        config.width = (typeof config.width === "undefined") ? 400 : config.width;
        config.height = (typeof config.height === "undefined") ? 400 : config.height;

        if (config.fullScreen) {
            SNAKE.addEventListener(window,"resize", function() {
                me.setupPlayingField();
            }, false);
        }

        me.setBoardState(0);

        if (config.boardContainer) {
            me.setBoardContainer(config.boardContainer);
        }

    }; // end return function
})();  
