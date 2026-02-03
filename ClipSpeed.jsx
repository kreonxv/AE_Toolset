// Get the selected layer
var selectedLayer = app.project.activeItem.selectedLayers[0];

// Enable time remapping


// Create an undo group
app.beginUndoGroup("Apply Expression");

selectedLayer.timeRemapEnabled = true;

// Add "Speed" slider
var speedSlider = selectedLayer.Effects.addProperty("Slider Control");
speedSlider.name = "Speed";
speedSlider.property("Slider").setValue(100);

// Add "Offset" slider
var offsetSlider = selectedLayer.Effects.addProperty("Slider Control");
offsetSlider.name = "Offset";
offsetSlider.property("Slider").setValue(0);

// Add "FPS" slider
var fpsSlider = selectedLayer.Effects.addProperty("Slider Control");
fpsSlider.name = "FPS";
fpsSlider.property("Slider").setValue(selectedLayer.containingComp.frameRate);

// Apply expression to time remap property
var expression = 'val = value + effect("Offset")("Slider");\n' +
                 'speedControl = effect("Speed")("Slider");\n' +
                 'frameDur = thisComp.frameDuration;\n' +
                 '\n' +
                 'for (i = 0; i < time; i += frameDur) {\n' +
                 '    val += speedControl.valueAtTime(i) / 100;\n' +
                 '}\n' +
                 'val * frameDur;';

// Add expression to time remap property
selectedLayer.timeRemap.expression = expression;

var expression2 = 'if (effect("FPS")("Slider") > 0.5) {Math.round(effect("FPS")("Slider"));} else {effect("FPS")("Slider");}'

// Add "Posterize Time" effect
var posterizeTimeEffect = selectedLayer.Effects.addProperty("Posterize Time");
posterizeTimeEffect.property("Frame Rate").expression = expression2;

// End the undo group
app.endUndoGroup();