console.log('app.js');

const brushSizes = {
    small: 5,
    medium: 10,
    large: 20
};

const brushModes = {
    pen: 'source-over',
    eraser: 'destination-out'
};

let hoverBrushSize = 5 / 2;


const colorPalatte = document.querySelector('.color-palatte');

colorPalatte.addEventListener('click', (e) => {
    const selectedColor = colorPalatte.querySelector('input:checked');
    console.log(selectedColor.id);
    color = selectedColor.id;
});

const brushTypes = document.querySelector('.brushTypes');

brushTypes.addEventListener('click', (e)=>{
    const selectedBrush = brushTypes.querySelector('input:checked');
    console.log(selectedBrush.id);
    drawMode = selectedBrush.id;
    hoverBrushSize = brushSizes[brushSize] / 2 * (drawMode == 'eraser' ? 10 : 1);
});

const brushSizesDiv = document.querySelector('.brushSizes');

brushSizesDiv.addEventListener('click', (e) => {
    const selectedSize = brushSizesDiv.querySelector('input:checked');
    console.log(selectedSize.id);
    brushSize = selectedSize.id;
    hoverBrushSize = brushSizes[brushSize] / 2 * (drawMode == 'eraser' ? 10 : 1);
});

let drawMode = brushTypes.querySelector('input:checked').id;

let color = 'black';

let eraseMode = false;

let brushSize = 'small';

let canvasSnapshot = null;

let undoStack = [];
let redoStack = [];

let lastX = null;
let lastY = null;

let isDrawing = false;

/**
 * @type {HTMLCanvasElement}
 */
const canvas = document.querySelector('.drawingSheet');
/**
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/**
 * @type {HTMLCanvasElement}
 */
const brushPositionCanvas = document.querySelector('.brushPosition');
/**
 * @type {CanvasRenderingContext2D}
*/
const brushPositionCtx = brushPositionCanvas.getContext('2d');
brushPositionCanvas.width = window.innerWidth;
brushPositionCanvas.height = window.innerHeight;


function drawBrush(e) {
    //draw a hollow circle
    brushPositionCtx.clearRect(0, 0, brushPositionCanvas.width, brushPositionCanvas.height);
    brushPositionCtx.beginPath();
    brushPositionCtx.arc(e.clientX, e.clientY, hoverBrushSize, 0, 2 * Math.PI);
    brushPositionCtx.stroke();
}

function handlePointerMove(e) {
    drawBrush(e);
    //console.log(e.clientX, e.clientY);
    if (isDrawing) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (canvasSnapshot) {
            ctx.putImageData(canvasSnapshot, 0, 0);
        }
        draw(e);
    }
}

function handleTouchMove(e) {
    drawBrush(e.touches[0]);
    if (isDrawing) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (canvasSnapshot) {
            ctx.putImageData(canvasSnapshot, 0, 0);
        }
        draw(e.touches[0]);
    }
}


function handlePointerDown(e) {
    isDrawing = true;
    ctx.beginPath();
    ctx.lineWidth = brushSizes[brushSize];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSizes[brushSize];
    [lastX, lastY] = [e.clientX, e.clientY];
    canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function handleTouchDown(e) {
    console.log(e.touches[0]);
    isDrawing = true;
    ctx.beginPath();
    ctx.lineWidth = brushSizes[brushSize];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSizes[brushSize];
    [lastX, lastY] = [e.touches[0].clientX, e.touches[0].clientY];
    canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function handlePointerUp(e) {
    isDrawing = false;
    endDraw();
}

function handleTouchUp(e) {
    isDrawing = false;
    endDraw();
}



function draw(e) {
    if (!isDrawing) return;
    if (drawMode === 'pen') {
        drawPen(e);
    } else if (drawMode === 'line') {
        drawLine(e);
    } else if (drawMode === 'rectangle') {
        drawRectangle(e);
    } else if (drawMode === 'circle') {
        drawCircle(e);
    } else if (drawMode === 'triangle') {
        drawTriangle(e);
    } else if (drawMode === 'eraser') {
        //TODO
        erase(e);
    }
}

function erase(e) {
    ctx.globalCompositeOperation = brushModes[drawMode];
    //ctx.beginPath();
    ctx.lineWidth = brushSizes[brushSize] * 10;
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
    [lastX, lastY] = [e.clientX, e.clientY]; // Update lastX and lastY for the next stroke
}

function drawPen(e) {
    //ctx.beginPath(); // Start a new path for each pen stroke
    ctx.globalCompositeOperation = brushModes[drawMode];

    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();

    [lastX, lastY] = [e.clientX, e.clientY]; // Update lastX and lastY for the next stroke
}

function drawLine(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (canvasSnapshot) {
        ctx.putImageData(canvasSnapshot, 0, 0);
    }
    ctx.globalCompositeOperation = brushModes[drawMode];
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
}

function drawRectangle(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (canvasSnapshot) {
        ctx.putImageData(canvasSnapshot, 0, 0);
    }
    ctx.globalCompositeOperation = brushModes[drawMode];
    ctx.beginPath();
    ctx.rect(lastX, lastY, e.clientX - lastX, e.clientY - lastY);
    ctx.stroke();
}


function drawCircle(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (canvasSnapshot) {
        ctx.putImageData(canvasSnapshot, 0, 0);
    }
    ctx.globalCompositeOperation = brushModes[drawMode];
    ctx.beginPath();
    ctx.arc(lastX, lastY, Math.sqrt(Math.pow(e.clientX - lastX, 2) + Math.pow(e.clientY - lastY, 2)), 0, 2 * Math.PI);
    ctx.stroke();
}


function drawTriangle(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (canvasSnapshot) {
        ctx.putImageData(canvasSnapshot, 0, 0);
    }
    ctx.globalCompositeOperation = brushModes[drawMode];
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.lineTo(lastX, e.clientY);
    ctx.closePath();
    ctx.stroke();
}

function endDraw() {
    if (lastX !== null && lastY !== null) { // Check if there was any drawing action
        undoStack.push(canvas.toDataURL());
        //console.log('Drawing ended');
        redoStack = [];
        isDrawing = false;
        enableRedo = false;
        if (undoStack.length > 20) {
            undoStack.shift();
        }
        //console.log(undoStack.length);
        if (undoStack.length > 0) {
            undoButton.disabled = false;
        }
        redoButton.disabled = true;
    }
    lastX = null; // Reset lastX and lastY after ending the draw
    lastY = null;
}


canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('mouseup', handlePointerUp);


canvas.addEventListener('touchstart', handleTouchDown);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchUp);


const undoButton = document.getElementById('undo');
const redoButton = document.getElementById('redo');
const clearButton = document.getElementById('clear');

undoButton.addEventListener('click', handleUndo);
redoButton.addEventListener('click', handleRedo);
clearButton.addEventListener('click', handleClear);

undoStack.push(canvas.toDataURL()); // Save the initial state of the canvas

function handleClear() {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    undoStack.length = 0;
    redoStack.length = 0;
    undoStack.push(canvas.toDataURL());
    undoButton.disabled = true;
    redoButton.disabled = true;
}

function handleUndo() {
    if (undoStack.length > 1) { // Check if there's at least one state in the undo stack
        redoStack.push(undoStack.pop()); // Move the current state to the redo stack
        const undoDataURL = undoStack[undoStack.length - 1]; // Get the last state from the undo stack
        const image = new Image();
        image.src = undoDataURL;
        image.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0); // Draw the image on the canvas
        };

        // Enable/disable undo and redo buttons
        undoButton.disabled = undoStack.length === 1;
        redoButton.disabled = false; // Redo button should be enabled if there's a state in the redo stack
    }
}

function handleRedo() {
    if (redoStack.length > 0) {
        undoStack.push(redoStack.pop()); // Move the current state to the undo stack
        const redoDataURL = undoStack[undoStack.length - 1]; // Get the last state from the undo stack
        const image = new Image();
        image.src = redoDataURL;
        image.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0); // Draw the image on the canvas
        };

        // Enable/disable undo and redo buttons
        undoButton.disabled = false; // Undo button should be enabled if there's a state in the undo stack
        redoButton.disabled = redoStack.length === 0;
    }
}


//save 
document.getElementById('saveButton').addEventListener('click', ()=>{
    const link = document.createElement("a");
    link.download = `canvas-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
});