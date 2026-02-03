

app.beginUndoGroup("ExErrors");

var comp = app.project.activeItem;
var layers = comp.selectedLayers;
var s;
var howMany = [];


function scan(propGroup){
    var i, prop;

    // Iterate over the specified property group's properties
    for (i=1; i <=propGroup.numProperties; i++)
    {
        prop = propGroup.property(i);
         if(propGroup.property(i).expressionError != "" && propGroup.property(i).expressionEnabled == true){
               
                    propGroup.property(i).expression = "";
                    howMany.push(1);}
                
        else if ((prop.propertyType === PropertyType.INDEXED_GROUP) || (prop.propertyType === PropertyType.NAMED_GROUP))
        {
            // Found an indexed or named group, so check its nested properties
            scan(prop);
        }
        }
    }


for(s=1; s <= comp.layers.length; s++){
    
    scan(comp.layers[s]);
    
    }

alert(howMany.length + " errors found and repaired.");

               
        app.endUndoGroup();
    
   



    