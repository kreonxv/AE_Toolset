
var comp = app.project.activeItem;
var layers = comp.selectedLayers;
var s;


function scanPropGroupProperties(propGroup){
    var i, prop;

    // Iterate over the specified property group's properties
    for (i=1; i<=propGroup.numProperties; i++)
    {
        prop = propGroup.property(i);
        if (prop.name == "Path" || prop.name == "Mask Path")    // Found a property
        {
            prop.addKey(comp.time);
        }
        else if ((prop.propertyType === PropertyType.INDEXED_GROUP) || (prop.propertyType === PropertyType.NAMED_GROUP))
        {
            // Found an indexed or named group, so check its nested properties
            scanPropGroupProperties(prop);
        }
        }
    }

app.beginUndoGroup("Path keyframes");


for(s=0; s <= layers.length-1; s++){
    
    scanPropGroupProperties(layers[s]);
    
    }




app.endUndoGroup();
