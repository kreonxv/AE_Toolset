// Check if a composition is open
if (app.project.activeItem instanceof CompItem) {
  var comp = app.project.activeItem;
  
  // Check if a layer is selected
  if (comp.selectedLayers.length > 0) {
    var selectedLayer = comp.selectedLayers[0];
    
    // Check if a property is selected
    if (selectedLayer.selectedProperties.length > 0) {
      var selectedProperty = selectedLayer.selectedProperties[0];
      
      // Prompt the user for minimum and maximum output values
      var minOutput = parseFloat(prompt("Enter the minimum output value:", "0"));
      var maxOutput = parseFloat(prompt("Enter the maximum output value:", "100"));
      
      // Add a slider control to the layer
      var sliderControl = selectedLayer.Effects.addProperty("ADBE Slider Control");
      sliderControl.name = "Mapping Slider";
      
      // Set slider values
      sliderControl.property("Slider").setValue(0);
      sliderControl.property("Slider").setValueAtTime(comp.time, 100);
      
      // Add an expression to the property
      selectedProperty.expression = 'linear(thisComp.layer("' + selectedLayer.name + '").effect("Mapping Slider")("Slider"), 0, 100, ' + minOutput + ', ' + maxOutput + ')';
    } else {
      alert("Please select a property on the layer.");
    }
  } else {
    alert("Please select a layer.");
  }
} else {
  alert("Please open a composition.");
}