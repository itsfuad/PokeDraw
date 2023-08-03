<script>
	import { onMount } from "svelte";
	import Toolbar from "./components/toolbar.svelte";

	let canvas;
	let canvas2;

	let color, brushSize, brushType;
	let brushPressure = 1;

	const brushSizeEnum = {
		small: 5,
		medium: 10,
		large: 15,
	};

	$: brushRadius =
		brushPressure *
		(brushSizeEnum[brushSize] * (brushType === "eraser" ? 5 : 1));

	let enableUndo = false;
	let enableRedo = false;

	let undoStack = [];
	let redoStack = [];

	let isDrawing = false;
	let lastX = 0;
	let lastY = 0;
	let snapshot = null;

	function handleUndo() {
		if (undoStack.length > 1) {
			const ctx = canvas.getContext("2d");
			const lastState = undoStack.pop();
			const img = new Image();
			img.src = undoStack[undoStack.length - 1];
			img.onload = () => {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
			};
			redoStack.push(lastState);
			// Update enableUndo after updating the canvas state
			if (undoStack.length === 1) {
				enableUndo = false;
			}
			enableRedo = true;
		}
	}

	function handleRedo() {
		if (redoStack.length > 0) {
			const ctx = canvas.getContext("2d");
			const lastState = redoStack.pop();
			const img = new Image();
			img.src = lastState;
			img.onload = () => {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
			};
			undoStack.push(lastState);
			// Update enableRedo after updating the canvas state
			enableRedo = redoStack.length > 0;
			enableUndo = true;
		}
	}

	function handleClear() {
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		undoStack = [];
		redoStack = [];
		undoStack.push(canvas.toDataURL());
		enableUndo = false;
		enableRedo = false;
	}


	function drawRectangle(e) {
		const ctx = canvas.getContext("2d");
		ctx.strokeStyle = color;
		ctx.strokeRect(
			e.offsetX,
			e.offsetY,
			lastX - e.offsetX,
			lastY - e.offsetY
		);
	}

	function drawLine(e) {
		const ctx = canvas.getContext("2d");
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
		ctx.lineTo(e.offsetX, e.offsetY);
		ctx.stroke();
	}

	function drawCircle(e) {
		const ctx = canvas.getContext("2d");

		const radius = Math.sqrt(
			Math.pow(lastX - e.offsetX, 2) + Math.pow(lastY - e.offsetY, 2)
		);
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.arc(lastX, lastY, radius, 0, 2 * Math.PI);
		ctx.stroke();
	}

	onMount(() => {
		const ctx = canvas.getContext("2d");
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		ctx.lineWidth = 5;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		const ctx2 = canvas2.getContext("2d");
		canvas2.width = window.innerWidth;
		canvas2.height = window.innerHeight;
		ctx2.lineWidth = 1;
		ctx2.lineCap = "round";
		ctx2.lineJoin = "round";

		ctx.fillStyle = "#f8f8f8";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		
		// Capture the initial state and add it to the undoStack
		undoStack.push(canvas.toDataURL());

		isDrawing = false;

		function draw(e) {
			if (!isDrawing) return;
			//console.log(brushType);

			if (brushType === "pen") {
				drawPen(e);
			} else if (brushType === "rectangle") {
				drawRectangle(e);
			} else if (brushType === "line") {
				drawLine(e);
			} else if (brushType === "circle") {
				drawCircle(e);
			} else {
				drawPen(e);
			}
			enableUndo = true;
			//[lastX, lastY] = [e.offsetX, e.offsetY];
		}

		function drawPen(e) {
			// color
			ctx.strokeStyle = brushType === "eraser" ? "#f8f8f8" : color;
			// brush size
			ctx.lineWidth = brushRadius;
			ctx.lineTo(e.offsetX, e.offsetY);
			ctx.stroke();
		}

		function drawBrush(e) {
			ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
			ctx2.strokeStyle = "#000000";
			ctx2.beginPath();
			ctx2.arc(e.offsetX, e.offsetY, brushRadius, 0, 2 * Math.PI);
			ctx2.stroke();
		}

		function handlePointerOutofScope() {
			endDraw();
			ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
		}

		function handlePointerMove(e) {
			drawBrush(e);
			if (!isDrawing) return;
			//restore the snapshot of the canvas
			if (snapshot) {
				ctx.putImageData(snapshot, 0, 0);
			}
			draw(e);
		}

		function handlePointerDown(e) {
			isDrawing = true;
			ctx.beginPath();
			ctx.lineWidth = brushSizeEnum[brushSize];
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			[lastX, lastY] = [e.offsetX, e.offsetY];
			snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
		}

		canvas.addEventListener("mousedown", handlePointerDown);
		canvas.addEventListener("mousemove", handlePointerMove);
		canvas.addEventListener("mouseup", handlePointerOutofScope);
		canvas.addEventListener("mouseout", handlePointerOutofScope);

		canvas.addEventListener("touchstart", (e) => {
			//e.preventDefault();
			handlePointerDown(e);
			console.log("Pointer Down");
		});

		canvas.addEventListener("touchmove", (e) => {
			//e.preventDefault();
			console.log("Pointer Move", e.offsetX, e.offsetY);
			//brushPressure = e.pressure ? e.pressure : 1;
			handlePointerMove(e);
		});

		canvas.addEventListener("touchend", (e) => {
			//e.preventDefault();
			handlePointerOutofScope();
			console.log("Pointer Up");
		});

		function endDraw() {
			if (!isDrawing) return;
			undoStack.push(canvas.toDataURL());
			redoStack = [];
			isDrawing = false;
			enableRedo = false;
			if (undoStack.length > 20) {
				// remove first element
				undoStack.shift();
			}
		}

		document.addEventListener("keydown", (e) => {
			if (e.ctrlKey && e.key === "z") {
				handleUndo();
			} else if (e.ctrlKey && e.key === "y") {
				handleRedo();
			} else if (e.ctrlKey && e.key === "c") {
				handleClear();
			}
		});

		//handle the window resize and keep the drawing
		window.addEventListener("resize", () => {
			const img = new Image();
			img.src = undoStack[undoStack.length - 1];
			img.onload = () => {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
			};
		});
	});

    function saveCanvas() {
        const link = document.createElement("a");
        link.download = `canvas-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
</script>

<canvas id="canvas2" bind:this={canvas2} />

<Toolbar
	{handleClear}
	{handleUndo}
	{handleRedo}
	bind:enableUndo
	bind:enableRedo
	bind:selectedColor={color}
	bind:selectedBrushSize={brushSize}
	bind:selectedBrushType={brushType}
	{saveCanvas}
/>

<canvas bind:this={canvas} />

<style>
	canvas {
		position: fixed;
		z-index: 9;
		width: 85%;
		height: 75%;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		border-radius: 10px;
	}

	#canvas2 {
		position: fixed;
		display: block;
		z-index: 11;
		background: white;
	}
</style>
