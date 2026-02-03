// Check if a composition is open and there is a selected property



if (app.project.activeItem instanceof CompItem && app.project.activeItem.selectedProperties.length > 0) {
  // Loop through all selected properties
  app.beginUndoGroup('Convert Expression to Keyframes and Set to Hold');
  for (var i = 0; i < app.project.activeItem.selectedProperties.length; i++) {
    var property = app.project.activeItem.selectedProperties[i];

 
   


      // Create keyframes based on expression evaluation
      var frameRate = app.project.activeItem.frameRate;
      for (var frame = 0; frame <= app.project.activeItem.duration * frameRate; frame++) {
        var time = frame / frameRate;
        property.setValueAtTime(time, property.value);
        property.setInterpolationTypeAtKey(property.nearestKeyIndex(time), KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
      }

  
    
  }

  // Alert when the process is complete
  alert('Expression converted to keyframes and keyframes set to hold.');
} else {
  // Alert if no composition is open or no property is selected
  alert('Please open a composition and select a property.');
}

