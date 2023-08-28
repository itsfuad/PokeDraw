console.log('app.js');

const brushSizes = {
    xsmall: 2.5,
    small: 5,
    medium: 10,
    large: 20
};

let hoverBrushSize = 5 / 2;

let color;

let color1 = localStorage.getItem('color1') || '#000000';
let color2 = localStorage.getItem('color2') || '#87CEEB';  // 'skyblue'
let color3 = localStorage.getItem('color3') || '#00FF00';  // 'lime'
let color4 = localStorage.getItem('color4') || '#FFFF00';  // 'yellow'
let color5 = localStorage.getItem('color5') || '#FFC0CB';  // 'pink'

document.documentElement.style.setProperty('--color1', color1);
document.documentElement.style.setProperty('--color2', color2);
document.documentElement.style.setProperty('--color3', color3);
document.documentElement.style.setProperty('--color4', color4);
document.documentElement.style.setProperty('--color5', color5);

localStorage.setItem('color1', color1);
localStorage.setItem('color2', color2);
localStorage.setItem('color3', color3);
localStorage.setItem('color4', color4);
localStorage.setItem('color5', color5);

const colorPalatte = document.querySelector('.color-palatte');

colorPalatte.addEventListener('click', (e) => {
    const selectedColor = colorPalatte.querySelector('input:checked');
    colorMap = localStorage.getItem(selectedColor.id);
    //console.log(`selected color: ${selectedColor.id} = ${colorMap}`);
    color = colorMap;
    localStorage.setItem('color', selectedColor.id);
});

colorPalatte.addEventListener('dblclick', (e) => {
    e.preventDefault();
    dynamicColor.click();
});

const brushTypes = document.querySelector('.brushTypes');

brushTypes.addEventListener('click', (e) => {
    const selectedBrush = brushTypes.querySelector('input:checked');
    //console.log(`selected brush: ${selectedBrush.id}`);
    drawMode = selectedBrush.id;
    hoverBrushSize = brushSizes[brushSize] / 2 * (drawMode == 'eraser' ? 10 : 1);
});

const brushSizesDiv = document.querySelector('.brushSizes');

brushSizesDiv.addEventListener('click', (e) => {
    const selectedSize = brushSizesDiv.querySelector('input:checked');
    //console.log(selectedSize.id);
    brushSize = selectedSize.id;
    hoverBrushSize = brushSizes[brushSize] / 2 * (drawMode == 'eraser' ? 10 : 1);
});

let drawMode = brushTypes.querySelector('input:checked').id;


let selectedColorFromStorage = localStorage.getItem('color') || 'color1';
color = localStorage.getItem(selectedColorFromStorage);

//console.log(`selected color: ${color}`);
colorPalatte.querySelector(`#${selectedColorFromStorage}`).checked = true;

let eraseMode = false;

let brushSize = 'xsmall';

let canvasSnapshot = null;

let undoStack = [];
let redoStack = [];

let lastX = null;
let lastY = null;

let isDrawing = false;

const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');
const clearButton = document.getElementById('clear');

undoButton.addEventListener('click', handleUndo);
redoButton.addEventListener('click', handleRedo);
clearButton.addEventListener('click', handleClear);

const canvasScale = 1;

/**
 * @type {HTMLCanvasElement}
 */
const canvas = document.querySelector('.drawingSheet');
/**
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth * canvasScale;
canvas.height = window.innerHeight * canvasScale;

ctx.scale(canvasScale, canvasScale); // Scale the canvas by the device pixel ratio
ctx.getContextAttributes().willReadFrequently = true;

/**
 * @type {HTMLCanvasElement}
 */
const brushPositionCanvas = document.querySelector('.brushPosition');
/**
 * @type {CanvasRenderingContext2D}
 */
const brushPositionCtx = brushPositionCanvas.getContext('2d');
brushPositionCanvas.width = window.innerWidth * canvasScale;
brushPositionCanvas.height = window.innerHeight * canvasScale;
brushPositionCtx.scale(canvasScale, canvasScale);
brushPositionCtx.getContextAttributes().willReadFrequently = true;


/**
 * 
 * @param {PointerEvent | TouchEvent} e
 */
function draw(e) {
    if (drawMode === 'fill') {
        // Fill the closed area with the selected color using flood fill algorithm


        // Get the current canvas image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Get the fill color
        const fillColor = toArrayRGBA(color);
        //console.log(fillColor, color);

        // Perform flood fill
        floodFillCanvas(ctx, imageData, e.clientX, e.clientY, fillColor, 10);

        return;
    }

    ctx.globalCompositeOperation = drawMode == 'eraser' ? 'destination-out' : 'source-over';
    //console.log(ctx.globalCompositeOperation);
    //console.log(drawMode);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
    ctx.lineCap = 'round';
    //turn off anti-aliasing

    ctx.stroke();

    lastX = e.clientX;
    lastY = e.clientY;
}

function toArrayRGBA(color) {
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    let a = parseInt(color.slice(7, 9), 16) || 255;
    return [r, g, b, a];
}


/**
 * Flood fill a closed area on the canvas using BFS algorithm with a color tolerance.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {ImageData} imageData - The canvas image data obtained using ctx.getImageData().
 * @param {number} startX - The starting x-coordinate of the fill.
 * @param {number} startY - The starting y-coordinate of the fill.
 * @param {number[]} fillColor - The color to fill with.
 * @param {number} tolerance - The color difference tolerance (0 to 255).
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

// Helper function to compare colors with tolerance
function colorsMatchWithTolerance(color1, color2, tolerance) {
    for (let i = 0; i < 4; i++) {
        if (Math.abs(color1[i] - color2[i]) > tolerance) {
            return false;
        }
    }
    return true;
}



// Helper functions

function getColorAtPixel(data, width, x, y) {
    const index = (y * width + x) * 4;
    return data.slice(index, index + 4);
}

function setColorAtPixel(data, width, x, y, color) {
    const index = (y * width + x) * 4;
    data[index] = color[0]; // Red
    data[index + 1] = color[1]; // Green
    data[index + 2] = color[2]; // Blue
    data[index + 3] = color[3]; // Alpha
}

function colorsMatch(color1, color2) {
    return (
        color1[0] === color2[0] &&
        color1[1] === color2[1] &&
        color1[2] === color2[2] &&
        color1[3] === color2[3]
    );
}


// draw straight line
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
    ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
    ctx.lineCap = 'round';
    ctx.stroke();
}

//draw rectangle
function drawRectangle(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (undoStack.length > 0) {
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    }

    let endX = e.clientX;
    let endY = e.clientY;

    //console.log(`lastX: ${lastX}, lastY: ${lastY}, endX: ${endX}, endY: ${endY}`);

    if (isShiftKeyDown) {
        //draw square
        ctx.beginPath();
        ctx.rect(lastX, lastY, endX - lastX, endX - lastX);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    } else {
        //draw rectangle
        ctx.beginPath();
        ctx.rect(lastX, lastY, endX - lastX, endY - lastY);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

//draw a ellipse
function drawEllipse(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (undoStack.length > 0) {
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    }

    let endX = e.clientX;
    let endY = e.clientY;

    if (isShiftKeyDown) {
        //draw a circle
        ctx.beginPath();
        ctx.arc(lastX, lastY, endX - lastX, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    } else {
        //draw a ellipse
        ctx.beginPath();
        ctx.ellipse(lastX, lastY, endX - lastX, endY - lastY, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

//draw a triangle
function drawTriangle(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (undoStack.length > 0) {
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    }

    let endX = e.clientX;
    let endY = e.clientY;

    if (isShiftKeyDown) {
        //draw a equilateral triangle
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(endX, lastY);
        ctx.lineTo((lastX + endX) / 2, lastY - Math.abs(endX - lastX) * Math.sqrt(3) / 2);
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    } else {
        //draw a triangle
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(lastX, endY);
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

// Function to handle mouse down event
function handlePointerDown(e) {
    isDrawing = true;
    lastX = e.clientX;
    lastY = e.clientY;

    draw(e);
}

const img = new Image();
img.src = 'public/fill-mini.png';

function drawBrushPosition(e) {
    if (drawMode == 'fill') {
        //draw the fill-mini.png image as the brush position

        brushPositionCtx.clearRect(0, 0, brushPositionCanvas.width, brushPositionCanvas.height);
        //a circle on the top left corner of the image
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

function endDrawing() {
    if (!isDrawing) {
        return;
    }
    //console.log('Drawing ended');
    isDrawing = false;
    lastX = null;
    lastY = null;
    canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStack.push(canvasSnapshot);
    redoStack = [];
    updateUndoRedoButtons();
}

function handlePointerMove(e) {
    if (isDrawing) {
        if (drawMode == 'pen' || drawMode == 'eraser') {
            draw(e);
        } else if (drawMode == 'line') {
            drawLine(e);
        } else if (drawMode == 'rectangle') {
            drawRectangle(e);
        } else if (drawMode == 'circle') {
            drawEllipse(e);
        } else if (drawMode == 'triangle') {
            drawTriangle(e);
        }
    }
    drawBrushPosition(e);
}

// Event Listeners
brushPositionCanvas.addEventListener('mousemove', (e) => {
    handlePointerMove(e);
});



brushPositionCanvas.addEventListener('mousedown', handlePointerDown);
brushPositionCanvas.addEventListener('mouseup', endDrawing);
brushPositionCanvas.addEventListener('mouseleave', endDrawing);

document.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});


// Add a flag to track if the Shift key is currently held down
let isShiftKeyDown = false;

// Function to handle keydown event
document.addEventListener('keydown', (e) => {
    if (e.shiftKey) {
        isShiftKeyDown = true;
    }
    if (e.key === 'z' && e.ctrlKey) {
        handleUndo();
    } else if (e.key === 'y' && e.ctrlKey) {
        handleRedo();
    } else if (e.key === 'c' && e.ctrlKey) {
        handleClear();
    } else if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        handleSave();
    }

    if (e.key === 'p' && !e.ctrlKey) {
        // Change to pen mode
        drawMode = 'pen';
    } else if (e.key === 'e' && !e.ctrlKey) {
        drawMode = 'eraser';
    } else if (e.key === 'l' && !e.ctrlKey) {
        drawMode = 'line';
    } else if (e.key === 'r' && !e.ctrlKey) {
        drawMode = 'rectangle';
    } else if (e.key === 'c' && !e.ctrlKey) {
        drawMode = 'circle';
    } else if (e.key === 't' && !e.ctrlKey) {
        drawMode = 'triangle';
    } else if (e.key === 'f' && !e.ctrlKey) {
        drawMode = 'fill';
    }
    
    updateDrawModeButtons();
});

function updateDrawModeButtons() {
    const brushes = brushTypes.querySelectorAll('input');
    //console.log(brushes);
    brushes.forEach((brush) => {
        if (brush.id == drawMode) {
            //console.log(brush.id);
            brush.checked = true;
        }
    });
}

// Function to handle keyup event
document.addEventListener('keyup', (e) => {
    if (!e.shiftKey) {
        isShiftKeyDown = false;
    }
});

// Function to undo the last action
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

// Function to redo the last undone action
function handleRedo() {
    if (redoStack.length > 0) {
        undoStack.push(redoStack.pop());
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        updateUndoRedoButtons();
    }
}

// Function to clear the canvas
function handleClear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
}

// Function to update undo and redo button states
function updateUndoRedoButtons() {
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
}

// Initialize the undo and redo buttons
updateUndoRedoButtons();

const saveButton = document.getElementById('saveButton');
saveButton.addEventListener('click', handleSave);

function handleSave() {
    const dataURL = canvas.toDataURL();
    const link = document.createElement('a');
    const fileName = `pokedraw-${Date.now()}.png`;
    link.download = fileName;
    link.href = dataURL;
    link.click();
}


const dynamicColor = document.getElementById('dynamicColor');
dynamicColor.addEventListener('change', (e) => {
    const colorDiv = colorPalatte.querySelector('input:checked');
    const colorLabel = colorPalatte.querySelector('label[for=' + colorDiv.id + ']');
    colorLabel.style.background = `linear-gradient(45deg, var(${dynamicColor.value}) 20%, rgb(255, 255, 255))`;
    color = dynamicColor.value;
    //update css
    //console.log(colorDiv.id);
    document.documentElement.style.setProperty(`--${colorDiv.id}`, color);
    localStorage.setItem(colorDiv.id, color);
    //update color on the DOM
    //console.log(color);
});


//if mobile
const deviceType = navigator.userAgent;
//console.log(deviceType);
if (deviceType.match(/Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i)) {
    document.body.innerHTML = `
    <div class="mobile">
        <span class="text1">Cannot run</span>
        <span class="text2">Use a desktop or laptop to run.</span>
    </div>
    `;
}