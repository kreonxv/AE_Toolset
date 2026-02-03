app.beginUndoGroup("Promote Properties to Controlers");


var comp = app.project.activeItem;
var layer = comp.selectedLayers[0];

var property = layer.selectedProperties;


var sliderer = function(a){
    var orval = property[a].value;
    var slider = layer.Effects.addProperty("ADBE Slider Control"); 
    slider.name = property[a].propertyGroup(1).name + " " + property[a].name;
    slider.property(1).setValue(orval);

    property[a].expression = "effect(" + "'" + slider.name + "'" +  ")('Slider')";}

var angler = function(b){
    var orang = property[b].value;
    var angle = layer.Effects.addProperty("ADBE Angle Control"); 
    angle.name = property[b].propertyGroup(1).name + " " + property[b].name;
    angle.property(1).setValue(orang);
    
    property[b].expression = "effect(" + "'" + angle.name + "'" +  ")('Angle')";}
    
var colorer = function(c){ 
    var orcolor = property[c].value;
    var colo = layer.Effects.addProperty("ADBE Color Control"); 
    colo.name = property[c].propertyGroup(1).name + " " + property[c].name;
    colo.property(1).setValue(orcolor);

    property[c].expression = "effect(" + "'" + colo.name + "'" +  ")('Color')";}

var pointerer = function(d){
    
    
    var x = property[d].value[0];
    var y = property[d].value[1];
    
    var pointcontrol = layer.Effects.addProperty("ADBE Point Control"); 
    pointcontrol.name = property[d].propertyGroup(1).name + " " + property[d].name;
    
    pointcontrol.property(1).setValue([x,y]);
    
    property[d].expression = "effect(" + "'" + pointcontrol.name + "'" +  ")('Point')";}

var TDpointerer = function(e){
    var x = property[e].value[0];
    var y = property[e].value[1];
    var z = property[e].value[2];
    
    var TDpointcontrol = layer.Effects.addProperty("ADBE Point3D Control"); 
    TDpointcontrol.name = property[e].propertyGroup(1).name + " " + property[e].name;
    TDpointcontrol.property(1).setValue([x,y,z]);
    
    property[e].expression = "effect(" + "'" + TDpointcontrol.name + "'" +  ")('3D Point')";}







for( i = 0;   i < property.length ;  i++){

var name = property[i].name;
var type = property[i].propertyValueType;

if(name == "Rotate" || name == "Rotation"){angler(i);}

else{
switch(type){
                      
	case PropertyValueType.OneD:sliderer(i);break;
	case PropertyValueType.TwoD:pointerer(i);break;
	case PropertyValueType.ThreeD:TDpointerer(i);break;
	case PropertyValueType.TwoD_SPATIAL:pointerer(i);break;
	case PropertyValueType.ThreeD_SPATIAL:TDpointerer(i);break;
	case PropertyValueType.COLOR:colorer(i);break;

	case PropertyValueType.MARKER: alert(name + " property cannot be promoted and was skipped.");break;
	case PropertyValueType.LAYER_INDEX: alert(name + " property cannot be promoted and was skipped.");break;
	case PropertyValueType.MASK_INDEX: alert(name + " property cannot be promoted and was skipped.");break;
	case PropertyValueType.SHAPE: alert(name + " property cannot be promoted and was skipped.");break;
	case PropertyValueType.TEXT_DOCUMENT: alert(name + " property cannot be promoted and was skipped.");break;
	case PropertyValueType.NO_VALUE: alert(name + " property cannot be promoted and was skipped.");break;
	case PropertyValueType.CUSTOM_VALUE: alert(name + " property cannot be promoted and was skipped.");break;
	default: break; 
    
	};

};

};


app.endUndoGroup();