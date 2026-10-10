// source/domain/training/training-session.js — Version 1.0
// Responsibility: validate and create an immutable training-session domain value.
const TYPES=Object.freeze(["strength","cardio","mobility","other"]);
const STATUSES=Object.freeze(["planned","in_progress","completed"]);
const INTENSITIES=Object.freeze(["light","moderate","vigorous","unknown"]);
const UNITS=Object.freeze(["kg","lb","bodyweight","band","machine","other"]);
const DATE=/^\d{4}-\d{2}-\d{2}$/;
function validDate(s){if(typeof s!=="string"||!DATE.test(s))return false;const d=new Date(s+"T00:00:00.000Z");return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
function text(v,f){if(typeof v!=="string"||!v.trim())throw new TypeError("Training session: "+f+" is required.");return v.trim();}
function setValue(s,i){
 if(!s||typeof s!=="object"||Array.isArray(s))throw new TypeError("Training session: invalid set.");
 if(!Number.isInteger(s.reps)||s.reps<0)throw new TypeError("Training session: reps must be a non-negative integer.");
 if(typeof s.completed!=="boolean")throw new TypeError("Training session: set completion must be explicit.");
 let resistance=null;
 if(s.resistance!=null){
  if(typeof s.resistance!=="object"||Array.isArray(s.resistance)||!UNITS.includes(s.resistance.unit))throw new TypeError("Training session: resistance unit is invalid.");
  const {value,unit}=s.resistance;
  if(unit==="bodyweight"){if(value!=null)throw new TypeError("Training session: bodyweight does not accept numeric resistance.");resistance={value:null,unit};}
  else{if(typeof value!=="number"||!Number.isFinite(value)||value<0)throw new TypeError("Training session: resistance must be non-negative.");resistance={value,unit};}
 }
 return Object.freeze({reps:s.reps,completed:s.completed,resistance});
}
function exerciseValue(e){
 if(!e||typeof e!=="object"||Array.isArray(e))throw new TypeError("Training session: invalid exercise.");
 const id=text(e.id,"exercise id"),name=text(e.name,"exercise name");
 if(!Array.isArray(e.muscleGroups)||e.muscleGroups.some(g=>typeof g!=="string"||!g.trim()))throw new TypeError("Training session: muscle groups must be explicit strings.");
 if(!Array.isArray(e.sets))throw new TypeError("Training session: exercise sets must be an array.");
 const muscleGroups=[...new Set(e.muscleGroups.map(g=>g.trim()))].sort();
 return Object.freeze({id,name,muscleGroups:Object.freeze(muscleGroups),sets:Object.freeze(e.sets.map(setValue))});
}
function createTrainingSession(input){
 if(!input||typeof input!=="object"||Array.isArray(input))throw new TypeError("Training session: input is required.");
 const id=text(input.id,"id");
 if(!validDate(input.date))throw new TypeError("Training session: date must be a valid ISO calendar date.");
 if(!TYPES.includes(input.activityType))throw new TypeError("Training session: activity type is invalid.");
 if(!STATUSES.includes(input.status))throw new TypeError("Training session: status is invalid.");
 if(!INTENSITIES.includes(input.intensity))throw new TypeError("Training session: intensity must be explicit.");
 if(!Array.isArray(input.exercises))throw new TypeError("Training session: exercises must be an array.");
 if(input.status==="completed"&&input.activityType==="strength"&&input.exercises.length===0)throw new TypeError("Training session: a completed strength session requires exercise records.");
 if(input.notes!=null&&typeof input.notes!=="string")throw new TypeError("Training session: notes must be text.");
 if(input.durationMinutes!=null&&(!Number.isInteger(input.durationMinutes)||input.durationMinutes<0))throw new TypeError("Training session: duration must be a non-negative integer.");
 if(!Number.isFinite(input.createdAt)||!Number.isFinite(input.updatedAt)||input.createdAt<0||input.updatedAt<input.createdAt)throw new TypeError("Training session: valid createdAt and updatedAt timestamps are required.");
 return Object.freeze({id,date:input.date,activityType:input.activityType,status:input.status,intensity:input.intensity,durationMinutes:input.durationMinutes??null,notes:input.notes?.trim()??"",exercises:Object.freeze(input.exercises.map(exerciseValue)),createdAt:input.createdAt,updatedAt:input.updatedAt});
}
export {TYPES as ACTIVITY_TYPES,STATUSES as SESSION_STATUSES,INTENSITIES,UNITS as RESISTANCE_UNITS,createTrainingSession};
