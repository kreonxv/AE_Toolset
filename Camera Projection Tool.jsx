/*
    Camera Projection Tool for After Effects
    Creates clean plates from camera projections with a two-stage workflow
    Version 2.0
*/

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function reCombine(lay) {
    if (!lay) return;
    var pos = lay.property("Transform").property("Position");
    if (pos && pos.dimensionsSeparated) {
        pos.dimensionsSeparated = false;
    }
}

function validateComp() {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Please select a composition.");
        return null;
    }
    return comp;
}

function copyEffects(sourceLayer, targetLayer) {
    var effects = sourceLayer.property("ADBE Effect Parade");
    if (!effects) return;

    for (var i = 1; i <= effects.numProperties; i++) {
        var effect = effects.property(i);
        var matchName = effect.matchName;
        try {
            var newEffect = targetLayer.property("ADBE Effect Parade").addProperty(matchName);
            for (var j = 1; j <= effect.numProperties; j++) {
                var prop = effect.property(j);
                var targetProp = newEffect.property(prop.name);
                if (targetProp && !targetProp.isReadOnly) {
                    try {
                        targetProp.setValue(prop.value);
                    } catch (e) {}
                }
            }
        } catch (e) {
            // Skip effects that can't be copied
        }
    }
}

// ============================================================================
// STAGE 1: PROJECTION SETUP
// ============================================================================

function setupProjection() {
    app.beginUndoGroup("Setup Camera Projection");
    
    var comp = validateComp();
    if (!comp) {
        app.endUndoGroup();
        return false;
    }

    // Classify selected layers
    comp.shadowMapResolution = 4096;
    var cameras = [];
    var solids = [];
    var others = [];
    
    for (var i = 0; i < comp.selectedLayers.length; i++) {
        var l = comp.selectedLayers[i];
        if (l instanceof CameraLayer) {
            cameras.push(l);
        } else if (l instanceof AVLayer && l.source && l.source.mainSource instanceof SolidSource) {
            solids.push(l);
        } else {
            others.push(l);
        }
    }

    // Validation
    if (cameras.length < 1) {
        alert("Please select at least one camera.");
        app.endUndoGroup();
        return false;
    }
    if (solids.length < 1) {
        alert("Please select at least one solid layer.");
        app.endUndoGroup();
        return false;
    }
    if (others.length !== 1) {
        alert("Please select exactly one non-camera, non-solid layer (the image to project).");
        app.endUndoGroup();
        return false;
    }

    var cam = cameras[0];
    var originalLayer = others[0];
    
    // Check if the image layer has transformations
    var hasTransforms = false;
    var transformWarnings = [];
    
    try {
        var transformProp = originalLayer.property("Transform");
        var pos = transformProp.property("Position").value;
        var scale = transformProp.property("Scale").value;
        var opacity = transformProp.property("Opacity").value;
        
        // Check for rotation property
        var rotation = 0;
        var rotProp = transformProp.property("Rotation");
        if (rotProp) {
            rotation = rotProp.value;
        }
        
        // Check for position changes (not at composition center for 2D layers)
        if (!originalLayer.threeDLayer) {
            var expectedX = comp.width / 2;
            var expectedY = comp.height / 2;
            if (Math.abs(pos[0] - expectedX) > 0.5 || Math.abs(pos[1] - expectedY) > 0.5) {
                hasTransforms = true;
                transformWarnings.push("Position has been changed (currently at [" + 
                    Math.round(pos[0]) + ", " + Math.round(pos[1]) + 
                    "], expected [" + Math.round(expectedX) + ", " + Math.round(expectedY) + "])");
            }
        } else {
            // For 3D layers, just note if position is far from origin
            if (Math.abs(pos[0]) > 0.5 || Math.abs(pos[1]) > 0.5 || Math.abs(pos[2]) > 0.5) {
                transformWarnings.push("3D Position is at [" + 
                    Math.round(pos[0]) + ", " + Math.round(pos[1]) + ", " + Math.round(pos[2]) + "] (noted)");
            }
        }
        
        // Check for scale changes
        if (Math.abs(scale[0] - 100) > 0.5 || Math.abs(scale[1] - 100) > 0.5) {
            hasTransforms = true;
            transformWarnings.push("Scale is " + Math.round(scale[0]) + "%, " + 
                Math.round(scale[1]) + "% (should be 100%, 100%)");
        }
        
        // Check for rotation
        if (Math.abs(rotation) > 0.5) {
            hasTransforms = true;
            transformWarnings.push("Layer has 2D rotation: " + Math.round(rotation) + "°");
        }
        
        // Check for 3D rotations if it's a 3D layer
        if (originalLayer.threeDLayer) {
            var xRot = transformProp.property("X Rotation").value;
            var yRot = transformProp.property("Y Rotation").value;
            var zRot = transformProp.property("Z Rotation").value;
            
            if (Math.abs(xRot) > 0.5 || Math.abs(yRot) > 0.5 || Math.abs(zRot) > 0.5) {
                hasTransforms = true;
                transformWarnings.push("Layer has 3D rotations [X:" + Math.round(xRot) + 
                    "°, Y:" + Math.round(yRot) + "°, Z:" + Math.round(zRot) + "°]");
            }
        }
        
        // Check for opacity changes
        if (Math.abs(opacity - 100) > 0.5) {
            transformWarnings.push("Opacity is " + Math.round(opacity) + "% (this is OK, but noted)");
        }
        
        // Check for effects
        var effects = originalLayer.property("ADBE Effect Parade");
        if (effects && effects.numProperties > 0) {
            transformWarnings.push("Layer has " + effects.numProperties + 
                " effect(s) applied (these will not be projected)");
        }
        
    } catch (e) {
        // If we can't check transforms, show the error and continue
        alert("Warning: Could not fully validate layer transformations.\nError: " + e.toString() + "\n\nProceeding with caution...");
    }
    
    // If transforms or warnings detected, inform the user
    if (hasTransforms || transformWarnings.length > 0) {
        var warningMsg = "";
        
        if (hasTransforms) {
            warningMsg = "⚠ WARNING: The image layer has transformations applied:\n\n";
        } else if (transformWarnings.length > 0) {
            warningMsg = "ℹ NOTICE: Image layer status:\n\n";
        }
        
        for (var w = 0; w < transformWarnings.length; w++) {
            warningMsg += "• " + transformWarnings[w] + "\n";
        }
        
        if (hasTransforms) {
            warningMsg += "\n⚠ This script works best with untransformed layers at their original size and position.\n";
            warningMsg += "\nThe projection may not align correctly with these transformations.\n";
            warningMsg += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            warningMsg += "RECOMMENDATIONS:\n";
            warningMsg += "1. Pre-compose the layer first:\n";
            warningMsg += "   Layer > Pre-compose (Ctrl/Cmd+Shift+C)\n";
            warningMsg += "   Choose 'Move all attributes'\n";
            warningMsg += "\n2. Or reset all transformations:\n";
            warningMsg += "   Position: Center of comp\n";
            warningMsg += "   Scale: 100%\n";
            warningMsg += "   Rotation: 0°\n";
            warningMsg += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
            warningMsg += "Do you want to continue anyway?";
            
            if (!confirm(warningMsg)) {
                app.endUndoGroup();
                return false;
            }
        } else {
            // Just notes, show as info
            warningMsg += "\nThese are just notices. Continuing...";
            alert(warningMsg);
        }
    }
    
    cam.name = "Projection_Camera";
    originalLayer.name = "Original_Image";

    // Process solids: set white, 3D, no shadows, no accepts lights
    for (var s = 0; s < solids.length; s++) {
        var solid = solids[s];
        try {
            solid.source.mainSource.color = [1, 1, 1]; // white
            if (!solid.threeDLayer) solid.threeDLayer = true;
            var matOpts = solid.property("Material Options");
            if (matOpts) {
                matOpts.property("Casts Shadows").setValue(0);
                matOpts.property("Accepts Lights").setValue(0);
            }
        } catch (e) {
            alert("Error processing solid " + (s + 1) + ": " + e);
        }
    }

    // Duplicate the original layer and hide the original
    var layer = originalLayer.duplicate();
    layer.name = "Projection_Image";
    originalLayer.enabled = false;

    // Make duplicated layer 3D if not already
    if (!layer.threeDLayer) {
        layer.threeDLayer = true;
    }

    // Recombine dimensions
    reCombine(cam);
    for (var s = 0; s < solids.length; s++) {
        reCombine(solids[s]);
    }
    reCombine(layer);
    reCombine(originalLayer);

    // Set original layer material options
    var layer1MatOpts = originalLayer.property("Material Options");
    if (layer1MatOpts) {
        try {
            layer1MatOpts.property("Accepts Shadows").setValue(0);
            layer1MatOpts.property("Accepts Lights").setValue(0);
        } catch (e) {}
    }

    // Set projection layer material options
    var layerMatOpts = layer.property("Material Options");
    if (layerMatOpts) {
        try {
            layerMatOpts.property("Casts Shadows").setValue(2); // Only
            layerMatOpts.property("Light Transmission").setValue(100);
        } catch (e) {}
    }

    // Set camera depth of field off
    var camOptions = cam.property("Camera Options");
    if (camOptions) {
        var dofProp = camOptions.property("Depth of Field");
        if (dofProp && dofProp.value !== false) {
            try {
                dofProp.setValue(false);
            } catch (e) {}
        }
    }

    // Add white spot light with specified properties, parent to camera
    var spotLight = comp.layers.addLight("Projection_Light", [comp.width / 2, comp.height / 2]);
    spotLight.threeDLayer = true;
    spotLight.lightType = LightType.SPOT;
    try {
        spotLight.property("Light Options").property("Intensity").setValue(100);
        spotLight.property("Light Options").property("Cone Angle").setValue(180);
        spotLight.property("Light Options").property("Cone Feather").setValue(0);
        spotLight.property("Light Options").property("Falloff").setValue(1); // None
        spotLight.property("Light Options").property("Casts Shadows").setValue(true);
        spotLight.property("Light Options").property("Shadow Darkness").setValue(100);
        spotLight.property("Light Options").property("Shadow Diffusion").setValue(0);
    } catch (e) {
        alert("Error setting light options: " + e);
    }

    // Copy camera transform to spot light
    try {
        spotLight.property("Position").setValue(cam.property("Position").value);
        spotLight.property("Orientation").setValue(cam.property("Orientation").value);
        spotLight.property("X Rotation").setValue(cam.property("X Rotation").value);
        spotLight.property("Y Rotation").setValue(cam.property("Y Rotation").value);
        spotLight.property("Z Rotation").setValue(cam.property("Z Rotation").value);
    } catch (e) {}

    // Parent spot light to camera
    spotLight.parent = cam;

    layer.property("Scale").setValue([5, 5, 5]);

    // Snap duplicated layer to camera cone
    try {
        layer.property("Position").setValue(cam.property("Position").value);
        layer.property("Orientation").setValue(cam.property("Orientation").value);
        layer.property("X Rotation").setValue(cam.property("X Rotation").value);
        layer.property("Y Rotation").setValue(cam.property("Y Rotation").value);
        layer.property("Z Rotation").setValue(cam.property("Z Rotation").value);
    } catch (e) {}

    // Build and apply expression for "end-of-cone"
    var expr =
        'zoom = thisComp.layer("' + cam.name + '").cameraOption.zoom;\n' +
        'pos = value;\n' +
        'offset = [0, 0, zoom];\n' +
        'delta = thisLayer.toWorld(offset) - thisLayer.toWorld([0, 0, 0]);\n' +
        'pos + delta;';
    
    var posProp = layer.property("Position");
    if (posProp.canSetExpression) {
        try {
            posProp.expression = "";
            posProp.expression = expr;
            var finalPos = posProp.valueAtTime(comp.time, false);
            posProp.expression = "";
            posProp.setValue(finalPos);
        } catch (e) {}
    }

    // Parent duplicated layer to camera
    layer.parent = cam;

    app.endUndoGroup();
    return true;
}

// ============================================================================
// STAGE 2: BAKE ALL SOLIDS
// ============================================================================

function bakeAllSolids() {
    var comp = validateComp();
    if (!comp) return false;

    // Find all white solids in the comp that were set up
    var solidsToProcess = [];
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer instanceof AVLayer && 
            layer.source && 
            layer.source.mainSource instanceof SolidSource &&
            layer.enabled) {
            
            // Check if it's a white solid (likely one we set up)
            var color = layer.source.mainSource.color;
            if (color[0] >= 0.99 && color[1] >= 0.99 && color[2] >= 0.99) {
                solidsToProcess.push(layer);
            }
        }
    }

    if (solidsToProcess.length === 0) {
        alert("No white solids found to bake.");
        return false;
    }

    var processedCount = 0;
    for (var s = 0; s < solidsToProcess.length; s++) {
        if (bakeSingleSolid(solidsToProcess[s])) {
            processedCount++;
        }
    }

    alert("Baking complete!\n\nProcessed " + processedCount + " solid(s).");
    return true;
}

function bakeSingleSolid(layer) {
    app.beginUndoGroup("Bake Solid: " + layer.name);

    var comp = layer.containingComp;

    var scale = layer.property("Scale").value;
    var anchor = layer.property("Anchor Point").value;
    var originalWidth = anchor[0] * 2;
    var originalHeight = anchor[1] * 2;

    if (isNaN(originalWidth) || isNaN(originalHeight) || originalWidth === 0 || originalHeight === 0) {
        alert("Cannot determine dimensions for solid: " + layer.name);
        app.endUndoGroup();
        return false;
    }

    var newWidth = Math.round(originalWidth * (scale[0] / 100));
    var newHeight = Math.round(originalHeight * (scale[1] / 100));
    if (newWidth < 1) newWidth = 1;
    if (newHeight < 1) newHeight = 1;

    var solidSource = layer.source.mainSource;
    var pixelAspect = (typeof solidSource.pixelAspect === "number") ? solidSource.pixelAspect : 1;

    // Create new baked solid
    var newSolid = comp.layers.addSolid(
        solidSource.color,
        layer.name + "_baked",
        newWidth,
        newHeight,
        pixelAspect,
        comp.duration
    );

    newSolid.threeDLayer = layer.threeDLayer;
    newSolid.position.setValue(layer.position.value);
    newSolid.orientation.setValue(layer.orientation.value);
    newSolid.rotationX.setValue(layer.rotationX.value);
    newSolid.rotationY.setValue(layer.rotationY.value);
    newSolid.rotationZ.setValue(layer.rotationZ.value);
    newSolid.parent = layer.parent;
    newSolid.property("Scale").setValue([100, 100, 100]);

    var matOpts = newSolid.property("Material Options");
    if (matOpts) {
        var acceptsLights = matOpts.property("Accepts Lights");
        if (acceptsLights) {
            acceptsLights.setValue(0);
        }
    }

    // Copy Effects
    copyEffects(layer, newSolid);
    layer.enabled = false;

    // Duplicate projection layers
    var toDuplicateNames = ["Projection_Camera", "Projection_Light", "Projection_Image"];
    var duplicates = [];

    for (var i = 0; i < toDuplicateNames.length; i++) {
        try {
            var orig = comp.layer(toDuplicateNames[i]);
            if (orig) {
                var dupe = orig.duplicate();
                duplicates.push(dupe);
            }
        } catch (e) {
            // Layer might not exist, continue
        }
    }

    // Store transform data before precomp
    var solidPos = newSolid.property("Position").value;
    var solidOrient = newSolid.property("Orientation").value;
    var solidRotX = newSolid.property("X Rotation").value;
    var solidRotY = newSolid.property("Y Rotation").value;
    var solidRotZ = newSolid.property("Z Rotation").value;

    // Array of layers we want to precompose: baked solid + duplicated layers
    var precompLayers = [newSolid].concat(duplicates);
    var layerIndices = [];
    for (var i = 0; i < precompLayers.length; i++) {
        if (precompLayers[i] && precompLayers[i].index) {
            layerIndices.push(precompLayers[i].index);
        }
    }

    var precompName = newSolid.name + "_Precomp";
    var precomp = comp.layers.precompose(layerIndices, precompName, true);

    // Resize precomp
    precomp.width = newWidth;
    precomp.height = newHeight;

    // Open precomp and add camera
    precomp.openInViewer();

    var camLayer = precomp.layers.addCamera("Camera_bake", [precomp.width / 2, precomp.height / 2]);
    camLayer.property("Point of Interest").expression = "position";
    camLayer.property("Camera Options").property("Zoom").setValue(500);
    camLayer.property("Position").setValue(solidPos);
    camLayer.property("Orientation").setValue(solidOrient);
    camLayer.property("X Rotation").setValue(solidRotX);
    camLayer.property("Y Rotation").setValue(solidRotY);
    camLayer.property("Z Rotation").setValue(solidRotZ);

    var expr =
        'pos = value;\n' +
        'offset = [0, 0, -1*zoom];\n' +
        'delta = thisLayer.toWorld(offset) - thisLayer.toWorld([0, 0, 0]);\n' +
        'pos + delta;';

    camLayer.property("Position").expression = "";
    camLayer.property("Position").expression = expr;
    var finalPos = camLayer.property("Position").valueAtTime(comp.time, false);
    camLayer.property("Position").expression = "";
    camLayer.property("Position").setValue(finalPos);

    // Return to original comp
    comp.openInViewer();

    var precompLayer = comp.layer(precomp.name);

    // Make it 3D
    precompLayer.threeDLayer = true;

    // Copy transform properties from original solid
    precompLayer.property("Position").setValue(layer.property("Position").value);
    precompLayer.property("Orientation").setValue(layer.property("Orientation").value);
    precompLayer.property("X Rotation").setValue(layer.property("X Rotation").value);
    precompLayer.property("Y Rotation").setValue(layer.property("Y Rotation").value);
    precompLayer.property("Z Rotation").setValue(layer.property("Z Rotation").value);

    // Set Material Options
    var matOpts = precompLayer.property("Material Options");
    if (matOpts) {
        var acceptsLights = matOpts.property("Accepts Lights");
        var acceptsShadows = matOpts.property("Accepts Shadows");
        var castsShadows = matOpts.property("Casts Shadows");

        if (acceptsLights) acceptsLights.setValue(0);
        if (acceptsShadows) acceptsShadows.setValue(0);
        if (castsShadows) castsShadows.setValue(0);
    }

    app.endUndoGroup();
    return true;
}

// ============================================================================
// LEGACY SINGLE BAKE FUNCTION (kept for backwards compatibility)
// ============================================================================

function bakeProjection() {
    app.beginUndoGroup("Bake Solid and Create Projection Precomp");

    var comp = validateComp();
    if (!comp) {
        app.endUndoGroup();
        return false;
    }

    if (comp.selectedLayers.length !== 1) {
        alert("Please select exactly one solid layer to bake.");
        app.endUndoGroup();
        return false;
    }

    var layer = comp.selectedLayers[0];

    if (!(layer instanceof AVLayer && layer.source && layer.source.mainSource instanceof SolidSource)) {
        alert("Selected layer is not a solid.");
        app.endUndoGroup();
        return false;
    }

    var scale = layer.property("Scale").value;
    var anchor = layer.property("Anchor Point").value;
    var originalWidth = anchor[0] * 2;
    var originalHeight = anchor[1] * 2;

    if (isNaN(originalWidth) || isNaN(originalHeight) || originalWidth === 0 || originalHeight === 0) {
        alert("Cannot determine solid width and height.");
        app.endUndoGroup();
        return false;
    }

    var newWidth = Math.round(originalWidth * (scale[0] / 100));
    var newHeight = Math.round(originalHeight * (scale[1] / 100));
    if (newWidth < 1) newWidth = 1;
    if (newHeight < 1) newHeight = 1;

    var solidSource = layer.source.mainSource;
    var pixelAspect = (typeof solidSource.pixelAspect === "number") ? solidSource.pixelAspect : 1;

    // Create new baked solid
    var newSolid = comp.layers.addSolid(
        solidSource.color,
        layer.name + "_baked",
        newWidth,
        newHeight,
        pixelAspect,
        comp.duration
    );

    newSolid.threeDLayer = layer.threeDLayer;
    newSolid.position.setValue(layer.position.value);
    newSolid.orientation.setValue(layer.orientation.value);
    newSolid.rotationX.setValue(layer.rotationX.value);
    newSolid.rotationY.setValue(layer.rotationY.value);
    newSolid.rotationZ.setValue(layer.rotationZ.value);
    newSolid.parent = layer.parent;
    newSolid.property("Scale").setValue([100, 100, 100]);

    var matOpts = newSolid.property("Material Options");
    if (matOpts) {
        var acceptsLights = matOpts.property("Accepts Lights");
        if (acceptsLights) {
            acceptsLights.setValue(0);
        }
    }

    // Copy Effects
    copyEffects(layer, newSolid);
    layer.enabled = false;

    // Duplicate projection layers
    var toDuplicateNames = ["Projection_Camera", "Projection_Light", "Projection_Image"];
    var duplicates = [];

    for (var i = 0; i < toDuplicateNames.length; i++) {
        var orig = comp.layer(toDuplicateNames[i]);
        if (orig) {
            var dupe = orig.duplicate();
            duplicates.push(dupe);
        }
    }

    // Store transform data before precomp
    var solidPos = newSolid.property("Position").value;
    var solidOrient = newSolid.property("Orientation").value;
    var solidRotX = newSolid.property("X Rotation").value;
    var solidRotY = newSolid.property("Y Rotation").value;
    var solidRotZ = newSolid.property("Z Rotation").value;

    // Array of layers we want to precompose: baked solid + duplicated layers
    var precompLayers = [newSolid].concat(duplicates);
    var layerIndices = [];
    for (var i = 0; i < precompLayers.length; i++) {
        if (precompLayers[i] && precompLayers[i].index) {
            layerIndices.push(precompLayers[i].index);
        }
    }

    var precompName = newSolid.name + "_Precomp";
    var precomp = comp.layers.precompose(layerIndices, precompName, true);

    // Resize precomp
    precomp.width = newWidth;
    precomp.height = newHeight;

    // Open precomp and add camera
    precomp.openInViewer();

    var camLayer = precomp.layers.addCamera("Camera_bake", [precomp.width / 2, precomp.height / 2]);
    camLayer.property("Point of Interest").expression = "position";
    camLayer.property("Camera Options").property("Zoom").setValue(500);
    camLayer.property("Position").setValue(solidPos);
    camLayer.property("Orientation").setValue(solidOrient);
    camLayer.property("X Rotation").setValue(solidRotX);
    camLayer.property("Y Rotation").setValue(solidRotY);
    camLayer.property("Z Rotation").setValue(solidRotZ);

    var expr =
        'pos = value;\n' +
        'offset = [0, 0, -1*zoom];\n' +
        'delta = thisLayer.toWorld(offset) - thisLayer.toWorld([0, 0, 0]);\n' +
        'pos + delta;';

    camLayer.property("Position").expression = "";
    camLayer.property("Position").expression = expr;
    var finalPos = camLayer.property("Position").valueAtTime(comp.time, false);
    camLayer.property("Position").expression = "";
    camLayer.property("Position").setValue(finalPos);

    // Return to original comp
    comp.openInViewer();

    var precompLayer = comp.layer(precomp.name);

    // Make it 3D
    precompLayer.threeDLayer = true;

    // Copy transform properties from original solid
    precompLayer.property("Position").setValue(layer.property("Position").value);
    precompLayer.property("Orientation").setValue(layer.property("Orientation").value);
    precompLayer.property("X Rotation").setValue(layer.property("X Rotation").value);
    precompLayer.property("Y Rotation").setValue(layer.property("Y Rotation").value);
    precompLayer.property("Z Rotation").setValue(layer.property("Z Rotation").value);

    // Set Material Options
    var matOpts = precompLayer.property("Material Options");
    if (matOpts) {
        var acceptsLights = matOpts.property("Accepts Lights");
        var acceptsShadows = matOpts.property("Accepts Shadows");
        var castsShadows = matOpts.property("Casts Shadows");

        if (acceptsLights) acceptsLights.setValue(0);
        if (acceptsShadows) acceptsShadows.setValue(0);
        if (castsShadows) castsShadows.setValue(0);
    }

    app.endUndoGroup();
    return true;
}

// ============================================================================
// USER INTERFACE
// ============================================================================

function buildUI(thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Camera Projection Tool", undefined, {resizeable: true});
    
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 16;

    // Info text
    var infoText = win.add("statictext", undefined, "Select: 1 Camera + 1+ Solids + 1 Image", {multiline: true});
    infoText.preferredSize = [-1, 20];
    infoText.graphics.font = ScriptUI.newFont(infoText.graphics.font.name, "REGULAR", 10);

    // Button group with main button and help
    var btnGroup = win.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignChildren = ["fill", "center"];
    btnGroup.spacing = 5;
    
    var setupBtn = btnGroup.add("button", undefined, "Setup Projection");
    setupBtn.preferredSize = [-1, 30];
    setupBtn.alignment = ["fill", "center"];
    
    var helpBtn = btnGroup.add("button", undefined, "?");
    helpBtn.preferredSize = [30, 30];
    helpBtn.alignment = ["right", "center"];

    // Button callbacks
    setupBtn.onClick = function() {
        if (setupProjection()) {
            alert("Projection setup completed successfully!\n\nNow baking all solids...");
            bakeAllSolids();
        }
    };

    helpBtn.onClick = function() {
        var helpText = "CAMERA PROJECTION TOOL - WORKFLOW\n\n" +
            "SETUP & BAKE PROJECTION\n" +
            "------------------------\n" +
            "1. Create a camera in your comp\n" +
            "2. Create solid layer(s) as projection surfaces\n" +
            "3. Import/create the image you want to project\n" +
            "   IMPORTANT: Image should be at original size/position\n" +
            "   (no scale, rotation, or position changes)\n" +
            "4. Select: Camera + Solid(s) + Image\n" +
            "5. Click 'Setup Projection'\n\n" +
            "The script will automatically:\n" +
            "- Create projection camera, light, and image\n" +
            "- Bake ALL selected solids into precomps\n" +
            "- Create a camera inside each precomp\n\n" +
            "What gets created:\n" +
            "- Projection_Camera (your camera)\n" +
            "- Projection_Light (spot light for shadows)\n" +
            "- Projection_Image (duplicated image layer)\n" +
            "- Original_Image (hidden original)\n" +
            "- [SolidName]_baked_Precomp (for each solid)\n\n" +
            "IMPORTANT NOTES:\n" +
            "- Image layers should be untransformed (100% scale,\n" +
            "  no rotation, centered position)\n" +
            "- If you need to transform the image, pre-compose it\n" +
            "  first with 'Move all attributes'\n" +
            "- Effects on the image layer will not be projected\n\n" +
            "Tips:\n" +
            "- Shadow Map Resolution is set to 4096\n" +
            "- All solids are set to white automatically\n" +
            "- Projection uses shadow-based projection\n" +
            "- Run multiple times for multiple camera projections";
        
        alert(helpText);
    };

    win.onResizing = win.onResize = function() {
        this.layout.resize();
    };

    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
        win.layout.resize();
    }

    return win;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

var myPanel = buildUI(this);
