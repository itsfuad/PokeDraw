(function() {
    "use strict";
    console.log('app.js');

    // Configuration & constants
    const brushSizes = {
        xsmall: 2.5,
        small: 5,
        medium: 10,
        large: 20
    };

    let hoverBrushSize = brushSizes.xsmall / 2;
    let color;
    let brushSize = 'xsmall';
    let drawMode = null;
    let isDrawing = false;
    let isShiftKeyDown = false;
    let canvasSnapshot = null;
    let undoStack = [];
    let redoStack = [];
    let lastX = null;
    let lastY = null;

    // Cached DOM Elements
    const canvas = document.querySelector('.drawingSheet');
    const ctx = canvas.getContext('2d');
    const brushPositionCanvas = document.querySelector('.brushPosition');
    const brushPositionCtx = brushPositionCanvas.getContext('2d');
    const colorPalatte = document.querySelector('.color-palatte');
    const brushTypes = document.querySelector('.brushTypes');
    const brushSizesDiv = document.querySelector('.brushSizes');
    const undoButton = document.getElementById('undo');
    const redoButton = document.getElementById('redo');
    const clearButton = document.getElementById('clear');
    const saveButton = document.getElementById('saveButton');
    const dynamicColor = document.getElementById('dynamicColor');

    // Set up canvas dimensions and scaling
    const canvasScale = 1;
    canvas.width = window.innerWidth * canvasScale;
    canvas.height = window.innerHeight * canvasScale;
    ctx.scale(canvasScale, canvasScale);
    ctx.getContextAttributes().willReadFrequently = true;

    brushPositionCanvas.width = window.innerWidth * canvasScale;
    brushPositionCanvas.height = window.innerHeight * canvasScale;
    brushPositionCtx.scale(canvasScale, canvasScale);
    brushPositionCtx.getContextAttributes().willReadFrequently = true;

    // Retrieve and set colors from local storage/configuration
    let color1 = localStorage.getItem('color1') || '#000000';
    let color2 = localStorage.getItem('color2') || '#87CEEB';  // skyblue
    let color3 = localStorage.getItem('color3') || '#00FF00';  // lime
    let color4 = localStorage.getItem('color4') || '#FFFF00';  // yellow
    let color5 = localStorage.getItem('color5') || '#FFC0CB';  // pink

    [color1, color2, color3, color4, color5].forEach((clr, idx) => {
        const key = `color${idx + 1}`;
        document.documentElement.style.setProperty(`--${key}`, clr);
        localStorage.setItem(key, clr);
    });

    // Set initial selected color
    let selectedColorFromStorage = localStorage.getItem('color') || 'color1';
    color = localStorage.getItem(selectedColorFromStorage);
    colorPalatte.querySelector(`#${selectedColorFromStorage}`).checked = true;
    
    // Set initial drawMode from brushTypes selection
    drawMode = brushTypes.querySelector('input:checked')?.id || 'pen';

    // Cross-Domain support for images
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = 'public/fill-mini.png';

    /**
     * Initializes all event listeners.
     */
    function init() {
        // Color palette listener
        colorPalatte.addEventListener('click', (e) => {
            const selectedColor = colorPalatte.querySelector('input:checked');
            color = localStorage.getItem(selectedColor.id);
            localStorage.setItem('color', selectedColor.id);
        });
    
        colorPalatte.addEventListener('dblclick', (e) => {
            e.preventDefault();
            dynamicColor.click();
        });

        // Brush types listener
        brushTypes.addEventListener('click', (e) => {
            const selectedBrush = brushTypes.querySelector('input:checked');
            drawMode = selectedBrush.id;
            // using brushSize defined on global scope
            hoverBrushSize = brushSizes[brushSize] / 2 * (drawMode === 'eraser' ? 10 : 1);
        });

        // Brush sizes listener
        brushSizesDiv.addEventListener('click', (e) => {
            const selectedSize = brushSizesDiv.querySelector('input:checked');
            brushSize = selectedSize.id;
            hoverBrushSize = brushSizes[brushSize] / 2 * (drawMode === 'eraser' ? 10 : 1);
        });

        // Canvas pointer and mouse events
        brushPositionCanvas.addEventListener('mousemove', handlePointerMove);
        brushPositionCanvas.addEventListener('mousedown', handlePointerDown);
        brushPositionCanvas.addEventListener('mouseup', endDrawing);
        brushPositionCanvas.addEventListener('mouseleave', endDrawing);
    
        // Global key events
        document.addEventListener('keydown', (e) => {
            handleModifierKeys(e);
            handleControlShortcuts(e);
            handleDrawingModeShortcuts(e);
        });
        document.addEventListener('keyup', (e) => {
            if (!e.shiftKey) isShiftKeyDown = false;
        });
    
        // Window resize
        document.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    
        // Undo/Redo/Clear/Save listeners
        undoButton.addEventListener('click', handleUndo);
        redoButton.addEventListener('click', handleRedo);
        clearButton.addEventListener('click', handleClear);
        saveButton.addEventListener('click', handleSave);
    
        // Dynamic color change listener
        dynamicColor.addEventListener('change', (e) => {
            const colorDiv = colorPalatte.querySelector('input:checked');
            const colorLabel = colorPalatte.querySelector(`label[for='${colorDiv.id}']`);
            colorLabel.style.background = `linear-gradient(45deg, var(${dynamicColor.value}) 20%, #fff)`;
            color = dynamicColor.value;
            document.documentElement.style.setProperty(`--${colorDiv.id}`, color);
            localStorage.setItem(colorDiv.id, color);
        });
    }

    /**
     * Draws on the canvas.
     * @param {PointerEvent | TouchEvent} e
     */
    function draw(e) {
        if (drawMode === 'fill') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const fillColor = toArrayRGBA(color);
            floodFillCanvas(ctx, imageData, e.clientX, e.clientY, fillColor, 10);
            return;
        }
        ctx.globalCompositeOperation = drawMode === 'eraser' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.clientX, e.clientY);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSizes[brushSize] * (drawMode === 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
        lastX = e.clientX;
        lastY = e.clientY;
    }
    
    /**
     * Converts a hex color string to an RGBA array.
     * @param {string} color - Hex color string.
     * @returns {number[]} RGBA array.
     */
    function toArrayRGBA(color) {
        let r = parseInt(color.slice(1, 3), 16);
        let g = parseInt(color.slice(3, 5), 16);
        let b = parseInt(color.slice(5, 7), 16);
        let a = parseInt(color.slice(7, 9), 16) || 255;
        return [r, g, b, a];
    }
    
    /**
     * Performs a flood fill using BFS.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {ImageData} imageData 
     * @param {number} startX 
     * @param {number} startY 
     * @param {number[]} fillColor 
     * @param {number} tolerance  
     */
    function floodFillCanvas(ctx, imageData, startX, startY, fillColor, tolerance = 0) {
        const { data, width, height } = imageData;
        const queue = [];
        queue.push([startX, startY]);
        const targetColorRGBA = getColorAtPixel(data, width, startX, startY);

        while (queue.length > 0) {
            const [x, y] = queue.shift();

            if (x < 0 || y < 0 || x >= width || y >= height) {
                continue;
            }

            const index = (y * width + x) * 4;
            const currentColorRGBA = [data[index], data[index + 1], data[index + 2], data[index + 3]];

            if (!colorsMatchWithTolerance(currentColorRGBA, targetColorRGBA, tolerance)) {
                continue;
            }

            if (colorsMatchWithTolerance(currentColorRGBA, fillColor, tolerance)) {
                continue;
            }

            setColorAtPixel(data, width, x, y, fillColor);

            queue.push([x - 1, y]);
            queue.push([x + 1, y]);
            queue.push([x, y - 1]);
            queue.push([x, y + 1]);
        }

        ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Helper function to compare colors with tolerance.
     * @param {number[]} color1 
     * @param {number[]} color2 
     * @param {number} tolerance 
     * @returns {boolean}
     */
    function colorsMatchWithTolerance(color1, color2, tolerance) {
        for (let i = 0; i < 4; i++) {
            if (Math.abs(color1[i] - color2[i]) > tolerance) {
                return false;
            }
        }
        return true;
    }

    /**
     * Helper function to get color at a specific pixel.
     * @param {Uint8ClampedArray} data 
     * @param {number} width 
     * @param {number} x 
     * @param {number} y 
     * @returns {number[]}
     */
    function getColorAtPixel(data, width, x, y) {
        const index = (y * width + x) * 4;
        return data.slice(index, index + 4);
    }

    /**
     * Helper function to set color at a specific pixel.
     * @param {Uint8ClampedArray} data 
     * @param {number} width 
     * @param {number} x 
     * @param {number} y 
     * @param {number[]} color 
     */
    function setColorAtPixel(data, width, x, y, color) {
        const index = (y * width + x) * 4;
        data[index] = color[0]; // Red
        data[index + 1] = color[1]; // Green
        data[index + 2] = color[2]; // Blue
        data[index + 3] = color[3]; // Alpha
    }

    /**
     * Draws a straight line.
     * @param {PointerEvent | TouchEvent} e 
     */
    function drawLine(e) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (undoStack.length > 0) {
            ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        }

        let endX = e.clientX;
        let endY = e.clientY;

        if (isShiftKeyDown) {
            const deltaX = Math.abs(endX - lastX);
            const deltaY = Math.abs(endY - lastY);
            if (deltaX > deltaY) {
                // Draw a purely horizontal line
                endY = lastY;
            } else {
                // Draw a purely vertical line
                endX = lastX;
            }
        }

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSizes[brushSize] * (drawMode === 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    /**
     * Draws a rectangle.
     * @param {PointerEvent | TouchEvent} e 
     */
    function drawRectangle(e) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (undoStack.length > 0) {
            ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        }

        let endX = e.clientX;
        let endY = e.clientY;

        if (isShiftKeyDown) {
            // Draw square
            ctx.beginPath();
            ctx.rect(lastX, lastY, endX - lastX, endX - lastX);
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSizes[brushSize] * (drawMode === 'eraser' ? 10 : 1);
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Draw rectangle
            ctx.beginPath();
            ctx.rect(lastX, lastY, endX - lastX, endY - lastY);
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSizes[brushSize] * (drawMode === 'eraser' ? 10 : 1);
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    /**
     * Draws an ellipse.
     * @param {PointerEvent | TouchEvent} e 
     */
    function drawEllipse(e) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (undoStack.length > 0) {
            ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        }

        let endX = e.clientX;
        let endY = e.clientY;

        if (isShiftKeyDown) {
            // Draw a circle
            ctx.beginPath();
            ctx.arc(lastX, lastY, endX - lastX, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSizes[brushSize] * (drawMode === 'eraser' ? 10 : 1);
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Draw an ellipse
            ctx.beginPath();
            ctx.ellipse(lastX, lastY, endX - lastX, endY - lastY, 0, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSizes[brushSize] * (drawMode === 'eraser' ? 10 : 1);
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    /**
     * Draws a triangle.
     * @param {PointerEvent | TouchEvent} e 
     */
    function drawTriangle(e) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (undoStack.length > 0) {
            ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        }

        let endX = e.clientX;
        let endY = e.clientY;

        if (isShiftKeyDown) {
            // Draw an equilateral triangle
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(endX, lastY);
            ctx.lineTo((lastX + endX) / 2, lastY - Math.abs(endX - lastX) * Math.sqrt(3) / 2);
            ctx.closePath();
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSizes[brushSize] * (drawMode === 'eraser' ? 10 : 1);
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Draw a triangle
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(endX, endY);
            ctx.lineTo(lastX, endY);
            ctx.closePath();
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSizes[brushSize] * (drawMode === 'eraser' ? 10 : 1);
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    /**
     * Handles pointer down events.
     * @param {PointerEvent | TouchEvent} e 
     */
    function handlePointerDown(e) {
        isDrawing = true;
        lastX = e.clientX;
        lastY = e.clientY;
        draw(e);
    }

    /**
     * Updates the brush position on the canvas.
     * @param {PointerEvent} e 
     */
    function drawBrushPosition(e) {
        if (drawMode === 'fill') {
            // Draw the fill-mini.png image as the brush position
            brushPositionCtx.clearRect(0, 0, brushPositionCanvas.width, brushPositionCanvas.height);
            // A circle on the top left corner of the image
            brushPositionCtx.fillStyle = color;
            brushPositionCtx.beginPath();
            brushPositionCtx.arc(e.clientX, e.clientY, 1, 0, Math.PI * 2);
            brushPositionCtx.fill();
            brushPositionCtx.drawImage(img, e.clientX, e.clientY, 20, 20);
            return;
        }
        brushPositionCtx.clearRect(0, 0, brushPositionCanvas.width, brushPositionCanvas.height);
        brushPositionCtx.beginPath();
        brushPositionCtx.arc(e.clientX, e.clientY, hoverBrushSize, 0, Math.PI * 2);
        brushPositionCtx.strokeStyle = 'black';
        brushPositionCtx.stroke();
    }

    /**
     * Ends the current drawing session.
     */
    function endDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        lastX = null;
        lastY = null;
        canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        undoStack.push(canvasSnapshot);
        redoStack = [];
        updateUndoRedoButtons();
    }

    /**
     * Handles pointer move events.
     * @param {PointerEvent} e 
     */
    function handlePointerMove(e) {
        if (isDrawing) {
            if (drawMode === 'pen' || drawMode === 'eraser') {
                draw(e);
            } else if (drawMode === 'line') {
                drawLine(e);
            } else if (drawMode === 'rectangle') {
                drawRectangle(e);
            } else if (drawMode === 'circle') {
                drawEllipse(e);
            } else if (drawMode === 'triangle') {
                drawTriangle(e);
            }
        }
        drawBrushPosition(e);
    }

    /**
     * Handles modifier keys like Shift and Ctrl.
     * @param {KeyboardEvent} e 
     */
    function handleModifierKeys(e) {
        if (e.shiftKey) isShiftKeyDown = true;
    }

    /**
     * Handles control-based shortcuts.
     * @param {KeyboardEvent} e 
     */
    function handleControlShortcuts(e) {
        if (e.ctrlKey) {
            switch (e.key) {
                case 'z': handleUndo(); break;
                case 'y': handleRedo(); break;
                case 'c': handleClear(); break;
                case 's':
                    e.preventDefault();
                    handleSave();
                    break;
            }
        }
    }

    /**
     * Handles drawing mode shortcuts.
     * @param {KeyboardEvent} e 
     */
    function handleDrawingModeShortcuts(e) {
        if (!e.ctrlKey) {
            switch (e.key) {
                case 'p':
                case 'b': drawMode = 'pen'; break;
                case 'e': drawMode = 'eraser'; break;
                case 'l': drawMode = 'line'; break;
                case 'r': drawMode = 'rectangle'; break;
                case 'c': drawMode = 'circle'; break;
                case 't': drawMode = 'triangle'; break;
                case 'f': drawMode = 'fill'; break;
            }
            updateDrawModeButtons();
        }
    }

    /**
     * Updates the draw mode buttons.
     */
    function updateDrawModeButtons() {
        const brushes = brushTypes.querySelectorAll('input');
        brushes.forEach(brush => {
            brush.checked = (brush.id === drawMode);
        });
    }

    /**
     * Handles undo action.
     */
    function handleUndo() {
        if (undoStack.length > 0) {
            redoStack.push(undoStack.pop());
            if (undoStack.length > 0) {
                ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            updateUndoRedoButtons();
        }
    }

    /**
     * Handles redo action.
     */
    function handleRedo() {
        if (redoStack.length > 0) {
            undoStack.push(redoStack.pop());
            ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
            updateUndoRedoButtons();
        }
    }

    /**
     * Handles clear action.
     */
    function handleClear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        undoStack = [];
        redoStack = [];
        updateUndoRedoButtons();
    }

    /**
     * Updates the undo and redo button states.
     */
    function updateUndoRedoButtons() {
        undoButton.disabled = undoStack.length === 0;
        redoButton.disabled = redoStack.length === 0;
    }

    /**
     * Handles save action.
     */
    function handleSave() {
        const dataURL = canvas.toDataURL();
        const link = document.createElement('a');
        const fileName = `pokedraw-${Date.now()}.png`;
        link.download = fileName;
        link.href = dataURL;
        link.click();
    }

    // Initialize event listeners and app
    init();

    // If mobile
    const deviceType = navigator.userAgent;

    if (RegExp(/Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i).exec(deviceType)) {
        document.body.innerHTML = `
        <div class="mobile">
            <span class="text1">Cannot run</span>
            <span class="text2">Use a desktop or laptop to run.</span>
        </div>
        `;
    }
})();