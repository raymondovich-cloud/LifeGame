// source/domain/training/training-program.js — Version 1.0
// Responsibility: validate and create an immutable weekly training-program domain value.
const STATUSES=Object.freeze(["active","paused","completed"]);
const UNITS=Object.freeze(["kg","lb","bodyweight","band","machine","other"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
function text(v,f){if(typeof v!=="string"||!v.trim())throw new TypeError("Training program: "+f+" is required.");return v.trim();}
function validDate(v){if(typeof v!=="string"||!DATE.test(v))return false;const d=new Date(v+"T00:00:00.000Z");return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;}
function createExercise(e){
 if(!e||typeof e!=="object"||Array.isArray(e))throw new TypeError("Training program: exercise is required.");
 const id=text(e.id,"exercise id"),name=text(e.name,"exercise name");
 if(!Array.isArray(e.muscleGroups)||!e.muscleGroups.length||e.muscleGroups.some(g=>typeof g!=="string"||!g.trim()))throw new TypeError("Training program: exercise muscle groups must be explicit.");
 if(!Number.isInteger(e.targetSets)||e.targetSets<1||e.targetSets>20)throw new TypeError("Training program: targetSets must be an integer between 1 and 20.");
 if(!Number.isInteger(e.targetReps)||e.targetReps<1||e.targetReps>100)throw new TypeError("Training program: targetReps must be an integer between 1 and 100.");
 if(!Number.isInteger(e.restSeconds)||e.restSeconds<0||e.restSeconds>600)throw new TypeError("Training program: restSeconds must be an integer between 0 and 600.");
 let targetResistance=null;
 if(e.targetResistance!=null){const r=e.targetResistance;
  if(typeof r!=="object"||Array.isArray(r)||!UNITS.includes(r.unit))throw new TypeError("Training program: target resistance unit is invalid.");
  if(r.unit==="bodyweight"){if(r.value!=null)throw new TypeError("Training program: bodyweight target cannot contain a numeric load.");targetResistance=Object.freeze({value:null,unit:r.unit});}
  else{if(typeof r.value!=="number"||!Number.isFinite(r.value)||r.value<0)throw new TypeError("Training program: target resistance must be a non-negative number.");targetResistance=Object.freeze({value:r.value,unit:r.unit});}
 }
 return Object.freeze({id,name,muscleGroups:Object.freeze([...new Set(e.muscleGroups.map(g=>g.trim()))].sort()),targetSets:e.targetSets,targetReps:e.targetReps,restSeconds:e.restSeconds,targetResistance});
}
function createWorkout(w){
 if(!w||typeof w!=="object"||Array.isArray(w))throw new TypeError("Training program: workout is required.");
 const id=text(w.id,"workout id"),title=text(w.title,"workout title");
 if(!Number.isInteger(w.weekday)||w.weekday<1||w.weekday>7)throw new TypeError("Training program: weekday must be an integer between 1 and 7.");
 if(!Array.isArray(w.exercises)||!w.exercises.length)throw new TypeError("Training program: each workout must contain at least one exercise.");
 if(w.durationMinutes!=null&&(!Number.isInteger(w.durationMinutes)||w.durationMinutes<1||w.durationMinutes>240))throw new TypeError("Training program: durationMinutes must be between 1 and 240.");
 const exercises=w.exercises.map(createExercise);
 if(new Set(exercises.map(e=>e.id)).size!==exercises.length)throw new TypeError("Training program: exercise IDs must be unique within a workout.");
 return Object.freeze({id,title,weekday:w.weekday,durationMinutes:w.durationMinutes??null,exercises:Object.freeze(exercises)});
}
function createTrainingProgram(input){
 if(!input||typeof input!=="object"||Array.isArray(input))throw new TypeError("Training program: input is required.");
 const id=text(input.id,"id");
 if(!UUID.test(id))throw new TypeError("Training program: id must be a canonical UUID.");
 if(!validDate(input.startDate))throw new TypeError("Training program: startDate must be a valid ISO calendar date.");
 if(!Number.isInteger(input.totalWeeks)||input.totalWeeks<1||input.totalWeeks>52)throw new TypeError("Training program: totalWeeks must be an integer between 1 and 52.");
 if(!STATUSES.includes(input.status))throw new TypeError("Training program: status is invalid.");
 if(!Array.isArray(input.workouts)||input.workouts.length<1||input.workouts.length>7)throw new TypeError("Training program: workouts must contain between 1 and 7 weekly workouts.");
 const workouts=input.workouts.map(createWorkout);
 if(new Set(workouts.map(w=>w.id)).size!==workouts.length)throw new TypeError("Training program: workout IDs must be unique.");
 if(new Set(workouts.map(w=>w.weekday)).size!==workouts.length)throw new TypeError("Training program: each workout must use a different weekday.");
 if(!Number.isFinite(input.createdAt)||input.createdAt<0||!Number.isFinite(input.updatedAt)||input.updatedAt<input.createdAt)throw new TypeError("Training program: createdAt and updatedAt must be valid non-decreasing timestamps.");
 return Object.freeze({id:id.toLowerCase(),name:text(input.name,"name"),startDate:input.startDate,totalWeeks:input.totalWeeks,status:input.status,workouts:Object.freeze(workouts.sort((a,b)=>a.weekday-b.weekday)),createdAt:input.createdAt,updatedAt:input.updatedAt});
}
export {createTrainingProgram};
