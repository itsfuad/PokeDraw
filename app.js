console.log('app.js');

const brushSizes = {
    xsmall: 2.5,
    small: 5,
    medium: 10,
    large: 20
};

const brushModes = {
    pen: 'source-over',
    eraser: 'destination-out'
};

let hoverBrushSize = 5 / 2;

let color;

let color1 = localStorage.getItem('color1') || 'black';
let color2 = localStorage.getItem('color2') || 'skyblue';
let color3 = localStorage.getItem('color3') || 'lime';
let color4 = localStorage.getItem('color4') || 'yellow';
let color5 = localStorage.getItem('color5') || 'pink';

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
    console.log(`selected color: ${selectedColor.id} = ${colorMap}`);
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
    console.log(`selected brush: ${selectedBrush.id}`);
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


let selectedColorFromStorage = localStorage.getItem('color') || 'color1';
color = localStorage.getItem(selectedColorFromStorage);

console.log(`selected color: ${color}`);
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
console.log(canvas.width, canvas.height);
ctx.getContextAttributes().willReadFrequently = true;

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
brushPositionCtx.getContextAttributes().willReadFrequently = true;

/**
 * 
 * @param {PointerEvent | TouchEvent} e
 */
function draw(e) {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.strokeStyle = color;
    ctx.globalCompositeOperation = brushModes[drawMode];
    ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
    ctx.lineCap = 'round';
    ctx.stroke();

    //console.log('draw', e.clientX, e.clientY, isDrawing, undoStack.length, redoStack.length);
    //console.log('draw', e.clientX, e.clientY, isDrawing);

    lastX = e.clientX;
    lastY = e.clientY;

    if (drawMode == 'fill'){
        console.log('fill');
        fill(e);
    }
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
    ctx.globalCompositeOperation = brushModes[drawMode];
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

    console.log(`lastX: ${lastX}, lastY: ${lastY}, endX: ${endX}, endY: ${endY}`);
    
    if (isShiftKeyDown){
        //draw square
        ctx.beginPath();
        ctx.rect(lastX, lastY, endX - lastX, endX - lastX);
        ctx.strokeStyle = color;
        ctx.globalCompositeOperation = brushModes[drawMode];
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    } else {
        //draw rectangle
        ctx.beginPath();
        ctx.rect(lastX, lastY, endX - lastX, endY - lastY);
        ctx.strokeStyle = color;
        ctx.globalCompositeOperation = brushModes[drawMode];
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

//draw a ellipse
function drawEllipse(e){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (undoStack.length > 0) {
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    }

    let endX = e.clientX;
    let endY = e.clientY;

    if (isShiftKeyDown){
        //draw a circle
        ctx.beginPath();
        ctx.arc(lastX, lastY, endX - lastX, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.globalCompositeOperation = brushModes[drawMode];
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    } else {
        //draw a ellipse
        ctx.beginPath();
        ctx.ellipse(lastX, lastY, endX - lastX, endY - lastY, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.globalCompositeOperation = brushModes[drawMode];
        ctx.lineWidth = brushSizes[brushSize] * (drawMode == 'eraser' ? 10 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

//draw a triangle
function drawTriangle(e){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (undoStack.length > 0) {
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    }

    let endX = e.clientX;
    let endY = e.clientY;

    if (isShiftKeyDown){
        //draw a equilateral triangle
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(endX, lastY);
        ctx.lineTo((lastX + endX) / 2, lastY - Math.abs(endX - lastX) * Math.sqrt(3) / 2);
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.globalCompositeOperation = brushModes[drawMode];
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
        ctx.globalCompositeOperation = brushModes[drawMode];
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

function drawBrushPosition(e){
    if (drawMode == 'fill'){
        //draw the fill-mini.png image as the brush position
        
        brushPositionCtx.clearRect(0, 0, brushPositionCanvas.width, brushPositionCanvas.height);        
        //a circle on the top left corner of the image
        brushPositionCtx.fillStyle = color;
        brushPositionCtx.beginPath();
        brushPositionCtx.arc(e.clientX - 10, e.clientY - 10, 1, 0, Math.PI * 2);
        brushPositionCtx.fill();
        brushPositionCtx.drawImage(img, e.clientX - 10, e.clientY - 10, 20, 20);
        return;
    }
    brushPositionCtx.clearRect(0, 0, brushPositionCanvas.width, brushPositionCanvas.height);
    brushPositionCtx.beginPath();
    brushPositionCtx.arc(e.clientX, e.clientY, hoverBrushSize, 0, Math.PI * 2);
    brushPositionCtx.strokeStyle = 'black';
    brushPositionCtx.stroke();
}

function endDrawing(){
    if (!isDrawing) {
        return;
    }
    console.log('Drawing ended');
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
        if (drawMode == 'pen' || drawMode == 'eraser'){
            draw(e);
        } else if (drawMode == 'line'){
            drawLine(e);
        } else if (drawMode == 'rectangle'){
            drawRectangle(e);
        } else if (drawMode == 'circle'){
            drawEllipse(e);
        } else if (drawMode == 'triangle'){
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
});

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
    console.log(colorDiv.id);
    document.documentElement.style.setProperty(`--${colorDiv.id}`, color);
    localStorage.setItem(colorDiv.id, color);
    //update color on the DOM
    //console.log(color);
});


//if mobile
const deviceType = navigator.userAgent;
console.log(deviceType);
if (deviceType.match(/Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i)) {
    document.body.innerHTML = `
    <div class="mobile">
        <span class="text1">Cannot run</span>
        <span class="text2">Use a desktop or laptop to run.</span>
    </div>
    `;
}