// source/application/training/training-program-persistence-result.js — Version 1.0
// Responsibility: validate a training-program repository result envelope at the Application boundary.
import {createTrainingProgram} from "../../domain/training/training-program.js";
function createTrainingProgramPersistenceResult(value,expectedProgramId){
 if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Training program repository: result must contain program and revision.");
 if(!Number.isSafeInteger(value.revision)||value.revision<1)throw new TypeError("Training program repository: revision must be a positive safe integer.");
 const program=createTrainingProgram(value.program);
 if(expectedProgramId!=null&&program.id!==expectedProgramId){const e=new Error("Training program repository: returned program identity does not match.");e.code="TRAINING_PROGRAM_REPOSITORY_CONTRACT_VIOLATION";throw e;}
 return Object.freeze({program,revision:value.revision});
}
export {createTrainingProgramPersistenceResult};
