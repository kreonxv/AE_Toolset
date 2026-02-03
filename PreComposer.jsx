var moveAllAttributes = true;
var comp = app.project.activeItem;

app.beginUndoGroup("Precompose selected Layers");

if (comp && comp instanceof CompItem) {
  var selectedLayers = [];
  var layers = comp.layers;

  // Cache the selected layers, starting at the bottom
  for (var i = layers.length; i > 0; i--) {
    var thisLayer = layers[i];
    if (thisLayer.selected) {
      selectedLayers.push(i);
    }
  }

  // Now precompose them individually
  for (var s = 0; s < selectedLayers.length; s++) {
    var thisLayerIndex = selectedLayers[s];
    var thisLayer = layers[thisLayerIndex];
    var precompName = thisLayer.name;

    // Precompose the selected layer
    layers.precompose([thisLayerIndex], precompName, moveAllAttributes);
  }
  app.endUndoGroup();
} else {
  alert("Please select a composition with layers.");
}
