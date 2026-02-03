// Nuke-Style Corner Pin Setup using CC Power Pin
// Place this file in: After Effects > Scripts > ScriptUI Panels

(function nukePowerPin(thisObj) {
    
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Nuke Power Pin", undefined, {resizeable: true});
        
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 10;
        win.margins = 16;
        
        // Title
        var titleGroup = win.add("group");
        titleGroup.orientation = "column";
        titleGroup.alignChildren = ["center", "top"];
        
        var title = titleGroup.add("statictext", undefined, "Nuke-Style Corner Pin");
        title.graphics.font = ScriptUI.newFont(title.graphics.font.name, ScriptUI.FontStyle.BOLD, 12);
        
        // Setup button
        var setupBtn = win.add("button", undefined, "Setup Power Pin Effect");
        setupBtn.preferredSize.height = 35;
        
        // Divider
        win.add("panel", undefined, "", {borderStyle: "black"}).alignment = "fill";
        
        // Enable/Disable buttons
        var buttonGroup = win.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignChildren = ["fill", "center"];
        buttonGroup.spacing = 10;
        
        var enableBtn = buttonGroup.add("button", undefined, "Enable Effect");
        var disableBtn = buttonGroup.add("button", undefined, "Disable Effect");
        
        enableBtn.preferredSize.height = 30;
        disableBtn.preferredSize.height = 30;
        
        // Divider
        win.add("panel", undefined, "", {borderStyle: "black"}).alignment = "fill";
        
        // Workflow instructions
        var workflowGroup = win.add("group");
        workflowGroup.orientation = "column";
        workflowGroup.alignChildren = ["fill", "top"];
        workflowGroup.spacing = 5;
        
        var workflowTitle = workflowGroup.add("statictext", undefined, "Workflow:");
        workflowTitle.graphics.font = ScriptUI.newFont(workflowTitle.graphics.font.name, ScriptUI.FontStyle.BOLD, 11);
        
        var step1 = workflowGroup.add("statictext", undefined, "1. Setup creates both Power Pins (OFF)", {multiline: true});
        var step2 = workflowGroup.add("statictext", undefined, "2. Position 4 pins on 'Setup Pin'", {multiline: true});
        var step3 = workflowGroup.add("statictext", undefined, "3. Click 'Enable Effect' button", {multiline: true});
        var step4 = workflowGroup.add("statictext", undefined, "4. Use 'Control Pin' to deform", {multiline: true});
        
        step1.graphics.font = ScriptUI.newFont(step1.graphics.font.name, ScriptUI.FontStyle.REGULAR, 10);
        step2.graphics.font = ScriptUI.newFont(step2.graphics.font.name, ScriptUI.FontStyle.REGULAR, 10);
        step3.graphics.font = ScriptUI.newFont(step3.graphics.font.name, ScriptUI.FontStyle.REGULAR, 10);
        step4.graphics.font = ScriptUI.newFont(step4.graphics.font.name, ScriptUI.FontStyle.REGULAR, 10);
        
        // Setup button click handler
        setupBtn.onClick = function() {
            app.beginUndoGroup("Setup Nuke Power Pin");
            
            var comp = app.project.activeItem;
            
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition.");
                app.endUndoGroup();
                return;
            }
            
            var layer = comp.selectedLayers[0];
            
            if (!layer) {
                alert("Please select a layer.");
                app.endUndoGroup();
                return;
            }
            
            try {
                setupPowerPin(layer);
                alert("Setup complete!\n\n" +
                      "Both effects are OFF.\n" +
                      "Pins snapped to layer corners.\n" +
                      "Unstretch is enabled on Setup Pin.\n\n" +
                      "1. Verify pins on 'Setup Pin'\n" +
                      "2. Click 'Enable Effect' button\n" +
                      "3. Use 'Control Pin' to deform");
            } catch(e) {
                alert("Error: " + e.toString());
            }
            
            app.endUndoGroup();
        };
        
        // Enable button - removes expressions, makes Control Pin independent
        enableBtn.onClick = function() {
            app.beginUndoGroup("Enable Power Pin Effect");
            
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition.");
                app.endUndoGroup();
                return;
            }
            
            var layer = comp.selectedLayers[0];
            if (!layer) {
                alert("Please select a layer.");
                app.endUndoGroup();
                return;
            }
            
            try {
                enableEffect(layer, comp.time);
                alert("Effect enabled!\n\nBoth effects are now ON.\nControl Pin is independent.\nYou can animate/adjust it freely.");
            } catch(e) {
                alert("Error: " + e.toString());
            }
            
            app.endUndoGroup();
        };
        
        // Disable button - adds expressions back, links Control Pin to Setup Pin
        disableBtn.onClick = function() {
            app.beginUndoGroup("Disable Power Pin Effect");
            
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please open a composition.");
                app.endUndoGroup();
                return;
            }
            
            var layer = comp.selectedLayers[0];
            if (!layer) {
                alert("Please select a layer.");
                app.endUndoGroup();
                return;
            }
            
            try {
                disableEffect(layer);
                alert("Effect disabled!\n\nControl Pin is linked to Setup Pin again.\nReposition your pins as needed.");
            } catch(e) {
                alert("Error: " + e.toString());
            }
            
            app.endUndoGroup();
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
    }
    
    function setupPowerPin(layer) {
        var effects = layer.property("ADBE Effect Parade");
        if (!effects) {
            throw new Error("Cannot access effects on this layer");
        }
        
        // Add first CC Power Pin
        var powerPin1;
        try {
            powerPin1 = effects.addProperty("CC Power Pin");
        } catch(e) {
            throw new Error("CC Power Pin not found. Make sure Cycore effects are installed.");
        }
        
        powerPin1.name = "Setup Pin (Unstretch ON)";
        
        // Turn OFF Setup Pin effect initially
        try {
            powerPin1.enabled = false;
        } catch(e) {}
        
        // --- AUTO-SET PINS TO LAYER CORNERS ---
        // Get layer dimensions - handle both regular and shape layers
        var w, h, left, top;
        
        try {
            // For shape layers and other layers without width/height, use sourceRectAtTime
            var comp = layer.containingComp;
            var rect = layer.sourceRectAtTime(comp.time, false);
            left = rect.left;
            top = rect.top;
            w = rect.width;
            h = rect.height;
        } catch(e) {
            // Fallback for footage/solid layers
            try {
                w = layer.width;
                h = layer.height;
                left = 0;
                top = 0;
            } catch(e2) {
                // Can't determine dimensions
                w = 100;
                h = 100;
                left = 0;
                top = 0;
            }
        }
        
        // Calculate corner positions
        var topLeft = [left, top];
        var topRight = [left + w, top];
        var bottomLeft = [left, top + h];
        var bottomRight = [left + w, top + h];
        
        // Set all 4 corner pins to layer edges using property names
        var pinSet = false;
        try {
            powerPin1.property("Top Left").setValue(topLeft);
            powerPin1.property("Top Right").setValue(topRight);
            powerPin1.property("Bottom Left").setValue(bottomLeft);
            powerPin1.property("Bottom Right").setValue(bottomRight);
            pinSet = true;
        } catch(e) {
            // Fallback: try using property indices if names don't work
            try {
                powerPin1.property(1).setValue(topLeft);
                powerPin1.property(2).setValue(topRight);
                powerPin1.property(3).setValue(bottomLeft);
                powerPin1.property(4).setValue(bottomRight);
                pinSet = true;
            } catch(e2) {
                alert("Could not set pin positions: " + e.toString() + " / " + e2.toString());
            }
        }
        // ---------------------------
        
        // Enable Unstretch on Setup Pin
        try {
            // Find Unstretch property (usually property 5 or 6)
            for (var i = 1; i <= powerPin1.numProperties; i++) {
                var prop = powerPin1.property(i);
                if (prop && (prop.name == "Unstretch" || prop.matchName.indexOf("Unstretch") > -1)) {
                    prop.setValue(1);
                    break;
                }
            }
        } catch(e) {}
        
        // Add second CC Power Pin
        var powerPin2;
        try {
            powerPin2 = effects.addProperty("CC Power Pin");
        } catch(e) {
            throw new Error("Could not add second CC Power Pin");
        }
        
        powerPin2.name = "Control Pin (Unstretch OFF)";
        
        // Turn OFF Control Pin effect initially
        try {
            powerPin2.enabled = false;
        } catch(e) {}
        
        // Link Control Pin to Setup Pin with simple expressions
        linkPins(powerPin1, powerPin2);
    }
    
    function linkPins(setupPin, controlPin) {
        // Link all 4 corners from Control Pin to Setup Pin
        for (var i = 1; i <= 4; i++) {
            try {
                var controlProp = controlPin.property(i);
                if (controlProp && controlProp.canSetExpression) {
                    controlProp.expression = 'effect("Setup Pin (Unstretch ON)")(' + i + ');';
                }
            } catch(e) {}
        }
    }
    
    function enableEffect(layer, currentTime) {
        var effects = layer.property("ADBE Effect Parade");
        if (!effects) {
            throw new Error("Cannot access effects");
        }
        
        var setupPin = effects.property("Setup Pin (Unstretch ON)");
        var controlPin = effects.property("Control Pin (Unstretch OFF)");
        
        if (!setupPin || !controlPin) {
            throw new Error("Power Pin effects not found. Run Setup first.");
        }
        
        // Turn ON both effects
        try {
            setupPin.enabled = true;
        } catch(e) {}
        
        try {
            controlPin.enabled = true;
        } catch(e) {}
        
        // For each corner: get current value from expression, remove expression, set keyframe
        for (var i = 1; i <= 4; i++) {
            try {
                var controlProp = controlPin.property(i);
                if (controlProp && controlProp.expression) {
                    // Get the current evaluated value
                    var currentValue = controlProp.value;
                    
                    // Remove expression
                    controlProp.expression = "";
                    
                    // Set keyframe at current time with the value
                    controlProp.setValueAtTime(currentTime, currentValue);
                }
            } catch(e) {}
        }
    }
    
    function disableEffect(layer) {
        var effects = layer.property("ADBE Effect Parade");
        if (!effects) {
            throw new Error("Cannot access effects");
        }
        
        var setupPin = effects.property("Setup Pin (Unstretch ON)");
        var controlPin = effects.property("Control Pin (Unstretch OFF)");
        
        if (!setupPin || !controlPin) {
            throw new Error("Power Pin effects not found. Run Setup first.");
        }
        
        // Re-link Control Pin to Setup Pin
        linkPins(setupPin, controlPin);
    }
    
    buildUI(thisObj);
    
})(this);