// Check if a composition is open
if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
  var comp = app.project.activeItem;
  
  // Check if at least two layers are selected
  if (comp.selectedLayers.length >= 2) {
    app.beginUndoGroup("Parent Layers Horizontally and Add Multiplier Slider");
    
    // Get the first selected layer to parent the others to
    var firstLayer = comp.selectedLayers[0];
    
    // Check if the slider control already exists on the first layer
    var slider = firstLayer.property("ADBE Effect Parade").property("Multiplier Slider");
    
    if (!slider) {
      // Add a slider control to the first layer if it doesn't already exist
      slider = firstLayer.Effects.addProperty("ADBE Slider Control");
      slider.property("ADBE Slider Control-0001").setValue(0); // Set the default value to 0
      slider.name = "Multiplier Slider";
    }
    
    // Calculate the total width of all selected layers
    var totalWidth = 0;
    
    for (var i = 0; i < comp.selectedLayers.length; i++) {
      var layer = comp.selectedLayers[i];
      
      // Calculate the width of the layer based on scaling
      var scale = layer.transform.scale.value;
      var width = layer.sourceRectAtTime(0, false).width * scale[0] / 100;
      
      // Update the total width
      totalWidth += width;
    }
    
    // Calculate the initial X position for the layers
    var xOffset = 0;
    
    for (var i = 0; i < comp.selectedLayers.length; i++) {
      var layer = comp.selectedLayers[i];
      
      // Calculate the width of the layer based on scaling
      var scale = layer.transform.scale.value;
      var width = layer.sourceRectAtTime(0, false).width * scale[0] / 100;
      
      // Parent the layer to the first layer (except the first layer itself)
      if (i > 0) {
        layer.parent = firstLayer;
        
        // Add the expression to adjust X position based on the multiplier slider and layer index
        var multiplier = i;
        var expression = 'var slider = thisComp.layer("' + firstLayer.name + '").effect("Multiplier Slider")("Slider");\n';
        expression += '[transform.position[0] + (slider * ' + multiplier + '), transform.position[1]];';
        layer.transform.position.expression = expression;
      }
      
      // Position the layer based on the total width, while keeping the Y position unchanged
      var newX = xOffset + (width / 2);
      var newY = layer.transform.position.value[1];
      layer.transform.position.setValue([newX, newY]);
      
      // Update the X offset for the next layer
      xOffset += width;
    }
    
    app.endUndoGroup();
  } else {
    alert("Please select at least two layers.");
  }
} else {
  alert("Please open a composition.");
}
// Check if a composition is open
if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
  var comp = app.project.activeItem;
  
  // Check if at least two layers are selected
  if (comp.selectedLayers.length >= 2) {
    app.beginUndoGroup("Parent Layers Horizontally and Add Multiplier Slider");
    
    // Get the first selected layer to parent the others to
    var firstLayer = comp.selectedLayers[0];
    
    // Check if the slider control already exists on the first layer
    var slider = firstLayer.property("ADBE Effect Parade").property("Multiplier Slider");
    
    if (!slider) {
      // Add a slider control to the first layer if it doesn't already exist
      slider = firstLayer.Effects.addProperty("ADBE Slider Control");
      slider.property("ADBE Slider Control-0001").setValue(0); // Set the default value to 0
      slider.name = "Multiplier Slider";
    }
    
    // Calculate the total width of all selected layers
    var totalWidth = 0;
    
    for (var i = 0; i < comp.selectedLayers.length; i++) {
      var layer = comp.selectedLayers[i];
      
      // Calculate the width of the layer based on scaling
      var scale = layer.transform.scale.value;
      var width = layer.sourceRectAtTime(0, false).width * scale[0] / 100;
      
      // Update the total width
      totalWidth += width;
    }
    
    // Calculate the initial X position for the layers
    var xOffset = 0;
    
    for (var i = 0; i < comp.selectedLayers.length; i++) {
      var layer = comp.selectedLayers[i];
      
      // Calculate the width of the layer based on scaling
      var scale = layer.transform.scale.value;
      var width = layer.sourceRectAtTime(0, false).width * scale[0] / 100;
      
      // Parent the layer to the first layer (except the first layer itself)
      if (i > 0) {
        layer.parent = firstLayer;
        
        // Add the expression to adjust X position based on the multiplier slider and layer index
        var multiplier = i;
        var expression = 'var slider = thisComp.layer("' + firstLayer.name + '").effect("Multiplier Slider")("Slider");\n';
        expression += '[transform.position[0] + (slider * ' + multiplier + '), transform.position[1]];';
        layer.transform.position.expression = expression;
      }
      
      // Position the layer based on the total width, while keeping the Y position unchanged
      var newX = xOffset + (width / 2);
      var newY = layer.transform.position.value[1];
      layer.transform.position.setValue([newX, newY]);
      
      // Update the X offset for the next layer
      xOffset += width;
    }
    
    app.endUndoGroup();
  } else {
    alert("Please select at least two layers.");
  }
} else {
  alert("Please open a composition.");
}
