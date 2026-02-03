/*
 AnchorPointTool.jsx
 version: 1.0
 date: February 2026
 
 Description: Repositions anchor points of selected layers with immediate positioning
*/

(function AnchorPointTool(thisObj) {
    
    // Button size variable - adjust this to change all button sizes
    var buttonSize = 30;
    
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Anchor Point Tool", undefined, {resizeable: false});
        
        win.orientation = "column";
        win.alignChildren = ["center", "top"];
        win.spacing = 5;
        win.margins = 10;
        
        // Title
        var titleGroup = win.add("group");
        titleGroup.add("statictext", undefined, "Anchor Point:");
        
        // Grid of buttons (3x3)
        var gridGroup = win.add("group");
        gridGroup.orientation = "column";
        gridGroup.spacing = 2;
        
        // Row 1
        var row1 = gridGroup.add("group");
        row1.orientation = "row";
        row1.spacing = 2;
        
        var btnTopLeft = row1.add("button", undefined, "╔");
        btnTopLeft.preferredSize = [buttonSize, buttonSize];
        btnTopLeft.helpTip = "Top Left";
        
        var btnTopCenter = row1.add("button", undefined, "╦");
        btnTopCenter.preferredSize = [buttonSize, buttonSize];
        btnTopCenter.helpTip = "Top Center";
        
        var btnTopRight = row1.add("button", undefined, "╗");
        btnTopRight.preferredSize = [buttonSize, buttonSize];
        btnTopRight.helpTip = "Top Right";
        
        // Row 2
        var row2 = gridGroup.add("group");
        row2.orientation = "row";
        row2.spacing = 2;
        
        var btnLeftCenter = row2.add("button", undefined, "╠");
        btnLeftCenter.preferredSize = [buttonSize, buttonSize];
        btnLeftCenter.helpTip = "Left Center";
        
        var btnCenter = row2.add("button", undefined, "╬");
        btnCenter.preferredSize = [buttonSize, buttonSize];
        btnCenter.helpTip = "Center";
        
        var btnRightCenter = row2.add("button", undefined, "╣");
        btnRightCenter.preferredSize = [buttonSize, buttonSize];
        btnRightCenter.helpTip = "Right Center";
        
        // Row 3
        var row3 = gridGroup.add("group");
        row3.orientation = "row";
        row3.spacing = 2;
        
        var btnBottomLeft = row3.add("button", undefined, "╚");
        btnBottomLeft.preferredSize = [buttonSize, buttonSize];
        btnBottomLeft.helpTip = "Bottom Left";
        
        var btnBottomCenter = row3.add("button", undefined, "╩");
        btnBottomCenter.preferredSize = [buttonSize, buttonSize];
        btnBottomCenter.helpTip = "Bottom Center";
        
        var btnBottomRight = row3.add("button", undefined, "╝");
        btnBottomRight.preferredSize = [buttonSize, buttonSize];
        btnBottomRight.helpTip = "Bottom Right";
        
        // --- Helper Functions ---
        
        function getLayerBoundingBox(layer) {
            var comp = layer.containingComp;
            var prevSelLayers = comp.selectedLayers;
            
            var bbox = {width: 0, height: 0, xoffset: 0, yoffset: 0};
            
            try {
                if (layer instanceof ShapeLayer) {
                    // For shape layers, create temporary mask to get bounds
                    comp.layer(layer.index).selected = true;
                    for (var i = 0; i < prevSelLayers.length; i++) {
                        if (prevSelLayers[i].index !== layer.index) {
                            prevSelLayers[i].selected = false;
                        }
                    }
                    
                    app.executeCommand(2367); // Create mask from layer bounds
                    var mask = layer.property("ADBE Masks").property(layer.property("ADBE Masks").numProperties);
                    var verts = mask.property("ADBE Mask Shape").value.vertices;
                    mask.remove();
                    
                    // Restore selection
                    for (var i = 0; i < prevSelLayers.length; i++) {
                        prevSelLayers[i].selected = true;
                    }
                    
                    bbox.width = Math.abs(verts[0][0] - verts[3][0]);
                    bbox.height = Math.abs(verts[0][1] - verts[1][1]);
                    bbox.xoffset = verts[0][0];
                    bbox.yoffset = verts[0][1];
                    
                } else if (layer instanceof TextLayer) {
                    // For text layers
                    var maskGroup = layer.property("ADBE Masks");
                    
                    if (maskGroup && maskGroup.numProperties > 0) {
                        // If masks exist, use mask bounds
                        var bounds = getMaskBounds(layer, comp.time);
                        bbox = bounds;
                    } else {
                        // Create temporary mask
                        comp.layer(layer.index).selected = true;
                        for (var i = 0; i < prevSelLayers.length; i++) {
                            if (prevSelLayers[i].index !== layer.index) {
                                prevSelLayers[i].selected = false;
                            }
                        }
                        
                        app.executeCommand(2367);
                        var mask = layer.property("ADBE Masks").property(layer.property("ADBE Masks").numProperties);
                        var verts = mask.property("ADBE Mask Shape").value.vertices;
                        mask.remove();
                        
                        // Restore selection
                        for (var i = 0; i < prevSelLayers.length; i++) {
                            prevSelLayers[i].selected = true;
                        }
                        
                        bbox.width = Math.abs(verts[0][0] - verts[3][0]);
                        bbox.height = Math.abs(verts[0][1] - verts[1][1]);
                        bbox.xoffset = verts[0][0];
                        bbox.yoffset = verts[0][1];
                    }
                    
                } else if (layer instanceof AVLayer) {
                    // For AV layers
                    var maskGroup = layer.property("ADBE Masks");
                    
                    if (maskGroup && maskGroup.numProperties > 0) {
                        // Use mask bounds
                        var bounds = getMaskBounds(layer, comp.time);
                        bbox = bounds;
                    } else {
                        // Use layer dimensions
                        bbox.width = layer.width;
                        bbox.height = layer.height;
                        bbox.xoffset = 0;
                        bbox.yoffset = 0;
                    }
                }
            } catch (e) {
                // Fallback to layer dimensions
                if (layer.width && layer.height) {
                    bbox.width = layer.width;
                    bbox.height = layer.height;
                    bbox.xoffset = 0;
                    bbox.yoffset = 0;
                }
            }
            
            return bbox;
        }
        
        function getMaskBounds(layer, time) {
            var maskGroup = layer.property("ADBE Masks");
            var top = Infinity;
            var bottom = -Infinity;
            var left = Infinity;
            var right = -Infinity;
            
            for (var m = 1; m <= maskGroup.numProperties; m++) {
                var mask = maskGroup.property(m);
                var maskShape = mask.property("ADBE Mask Shape");
                var shape = maskShape.valueAtTime(time, false);
                var verts = shape.vertices;
                var inTangents = shape.inTangents;
                var outTangents = shape.outTangents;
                
                for (var i = 0; i < verts.length; i++) {
                    var v = verts[i];
                    var inT = inTangents[i];
                    var outT = outTangents[i];
                    
                    // Check vertex and tangent points
                    top = Math.min(top, v[1], v[1] + inT[1], v[1] + outT[1]);
                    bottom = Math.max(bottom, v[1], v[1] + inT[1], v[1] + outT[1]);
                    left = Math.min(left, v[0], v[0] + inT[0], v[0] + outT[0]);
                    right = Math.max(right, v[0], v[0] + inT[0], v[0] + outT[0]);
                }
            }
            
            return {
                width: right - left,
                height: bottom - top,
                xoffset: left,
                yoffset: top
            };
        }
        
        function moveAnchorPoint(layer, position) {
            var boundingBox = getLayerBoundingBox(layer);
            if (!boundingBox) return;
            
            var newAnchor = [0, 0];
            var width = boundingBox.width;
            var height = boundingBox.height;
            var xOffset = boundingBox.xoffset;
            var yOffset = boundingBox.yoffset;
            
            // Calculate new anchor point position
            switch (position) {
                case "topLeft":
                    newAnchor = [xOffset, yOffset];
                    break;
                case "topCenter":
                    newAnchor = [xOffset + width / 2, yOffset];
                    break;
                case "topRight":
                    newAnchor = [xOffset + width, yOffset];
                    break;
                case "leftCenter":
                    newAnchor = [xOffset, yOffset + height / 2];
                    break;
                case "center":
                    newAnchor = [xOffset + width / 2, yOffset + height / 2];
                    break;
                case "rightCenter":
                    newAnchor = [xOffset + width, yOffset + height / 2];
                    break;
                case "bottomLeft":
                    newAnchor = [xOffset, yOffset + height];
                    break;
                case "bottomCenter":
                    newAnchor = [xOffset + width / 2, yOffset + height];
                    break;
                case "bottomRight":
                    newAnchor = [xOffset + width, yOffset + height];
                    break;
            }
            
            // Get current anchor point and position
            var anchorPoint = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
            var positionProp = layer.property("ADBE Transform Group").property("ADBE Position");
            
            var oldAnchor = anchorPoint.value;
            var oldPosition = positionProp.value;
            
            // Calculate offset
            var deltaX = newAnchor[0] - oldAnchor[0];
            var deltaY = newAnchor[1] - oldAnchor[1];
            
            // Set new anchor point
            anchorPoint.setValue(newAnchor);
            
            // Adjust position to keep layer in same visual position
            if (positionProp.dimensionsSeparated) {
                var xPos = layer.property("ADBE Transform Group").property("ADBE Position_0");
                var yPos = layer.property("ADBE Transform Group").property("ADBE Position_1");
                xPos.setValue(xPos.value + deltaX);
                yPos.setValue(yPos.value + deltaY);
            } else {
                if (oldPosition.length === 2) {
                    positionProp.setValue([oldPosition[0] + deltaX, oldPosition[1] + deltaY]);
                } else if (oldPosition.length === 3) {
                    positionProp.setValue([oldPosition[0] + deltaX, oldPosition[1] + deltaY, oldPosition[2]]);
                }
            }
        }
        
        function repositionAnchor(position) {
            var comp = app.project.activeItem;
            
            // Validate composition
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition.");
                return;
            }
            
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }
            
            app.beginUndoGroup("Reposition Anchor Point");
            
            try {
                for (var i = 0; i < selectedLayers.length; i++) {
                    var layer = selectedLayers[i];
                    moveAnchorPoint(layer, position);
                }
            } catch (e) {
                alert("Error: " + e.toString());
            }
            
            app.endUndoGroup();
        }
        
        // --- Event Handlers ---
        
        btnTopLeft.onClick = function() { repositionAnchor("topLeft"); };
        btnTopCenter.onClick = function() { repositionAnchor("topCenter"); };
        btnTopRight.onClick = function() { repositionAnchor("topRight"); };
        btnLeftCenter.onClick = function() { repositionAnchor("leftCenter"); };
        btnCenter.onClick = function() { repositionAnchor("center"); };
        btnRightCenter.onClick = function() { repositionAnchor("rightCenter"); };
        btnBottomLeft.onClick = function() { repositionAnchor("bottomLeft"); };
        btnBottomCenter.onClick = function() { repositionAnchor("bottomCenter"); };
        btnBottomRight.onClick = function() { repositionAnchor("bottomRight"); };
        
        // Layout
        win.layout.layout(true);
        if (win instanceof Window) {
            win.center();
            win.show();
        }
    }
    
    buildUI(thisObj);
    
})(this);
