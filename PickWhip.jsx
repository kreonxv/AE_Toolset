// Property Pick Whip - Silent Pick, Detailed Whip Alert
// Pick a property, then Whip it to another property

(function PropertyPickWhip(thisObj) {
    
    var STORAGE_KEY = "propertyPickWhip_minimal";
    
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Pick Whip", undefined, {resizeable: true});
        
        win.orientation = "column";
        win.alignChildren = ["fill", "fill"];
        win.spacing = 10;
        win.margins = 16;
        
        var pickBtn = win.add("button", undefined, "Pick");
        pickBtn.alignment = ["fill", "top"];
        pickBtn.minimumSize = [80, 40];
        
        var whipBtn = win.add("button", undefined, "Whip!");
        whipBtn.alignment = ["fill", "top"];
        whipBtn.minimumSize = [80, 40];
        
        // --- Helper Functions ---
        
        function getPropertyPath(prop) {
            var path = [];
            var currentProp = prop;
            while (currentProp.parentProperty !== null && currentProp.parentProperty.parentProperty !== null) {
                path.unshift(currentProp.name);
                currentProp = currentProp.parentProperty;
            }
            if (currentProp.parentProperty !== null) path.unshift(currentProp.name);
            return path;
        }

        function getPropertyDimensions(prop) {
            try {
                if (prop.value instanceof Array) {
                    if (prop.dimensionsSeparated !== undefined) {
                        var parentProp = prop.propertyGroup(1);
                        if (parentProp) {
                            try {
                                var testZ = parentProp.property("Z Position") || parentProp.property("ADBE Position_2");
                                var layer = prop.propertyGroup(prop.propertyDepth);
                                if (layer && layer.threeDLayer) return 3;
                                return 2;
                            } catch (e) { return 2; }
                        }
                    }
                    return prop.value.length;
                }
            } catch (e) {}
            return 1;
        }

        function saveToStorage(data) {
            try {
                // We now include propName in the serialization for the final alert
                var serialized = "compName:" + data.compName + "|layerName:" + data.layerName + "|propName:" + data.propName + "|propertyPath:" + data.propertyPath.join(",") + "|dimensions:" + data.dimensions;
                app.settings.saveSetting(STORAGE_KEY, "data", serialized);
                return true;
            } catch (e) { return false; }
        }

        function loadFromStorage() {
            try {
                if (app.settings.haveSetting(STORAGE_KEY, "data")) {
                    var str = app.settings.getSetting(STORAGE_KEY, "data");
                    var data = {};
                    var pairs = str.split("|");
                    for (var i = 0; i < pairs.length; i++) {
                        var pair = pairs[i].split(":");
                        if (pair[0] === "propertyPath") data[pair[0]] = pair[1].split(",");
                        else if (pair[0] === "dimensions") data[pair[0]] = parseInt(pair[1]);
                        else data[pair[0]] = pair[1];
                    }
                    return data;
                }
            } catch (e) {}
            return null;
        }

        // --- Event Handlers ---

        pickBtn.onClick = function() {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) return;
            
            var selectedProps = comp.selectedProperties;
            if (selectedProps.length !== 1) {
                alert("Please select exactly one property to Pick.");
                return;
            }

            var prop = selectedProps[0];
            try {
                var test = prop.value; // Verify it's a value property
                var layer = prop.propertyGroup(prop.propertyDepth);
                
                var data = {
                    compName: comp.name,
                    layerName: layer.name,
                    propName: prop.name,
                    propertyPath: getPropertyPath(prop),
                    dimensions: getPropertyDimensions(prop)
                };

                saveToStorage(data);
                // No alert here, as requested.
            } catch (e) {
                alert("Could not pick this property.");
            }
        };

        whipBtn.onClick = function() {
            app.beginUndoGroup("Whip Property");
            try {
                var sourceData = loadFromStorage();
                if (!sourceData) {
                    alert("No property picked yet.");
                    return;
                }

                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) return;

                var selectedProps = comp.selectedProperties;
                var successCount = 0;
                var targetNames = [];

                var expr = 'comp("' + sourceData.compName + '").layer("' + sourceData.layerName + '")';
                for (var j = 0; j < sourceData.propertyPath.length; j++) {
                    expr += '("' + sourceData.propertyPath[j] + '")';
                }

                for (var i = 0; i < selectedProps.length; i++) {
                    var targetProp = selectedProps[i];
                    if (targetProp.canSetExpression && getPropertyDimensions(targetProp) === sourceData.dimensions) {
                        targetProp.expression = expr;
                        successCount++;
                        targetNames.push(targetProp.name);
                    }
                }

                if (successCount > 0) {
                    // Display the comprehensive alert
                    alert("Whipped!\n\nSource: " + sourceData.propName + " (Layer: " + sourceData.layerName + ")\nApplied to: " + successCount + " property/properties (" + targetNames.join(", ") + ")");
                } else {
                    alert("No compatible properties selected to Whip.");
                }
            } catch (e) {
                alert("Error during Whip: " + e.toString());
            }
            app.endUndoGroup();
        };

        // Handle window resizing
        win.onResizing = win.onResize = function() {
            this.layout.resize();
        };

        win.layout.layout(true);
        if (win instanceof Window) {
            win.center();
            win.show();
        }
    }

    buildUI(thisObj);
})(this);
