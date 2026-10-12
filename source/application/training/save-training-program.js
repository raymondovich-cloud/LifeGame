// source/application/training/save-training-program.js — Version 1.0
// Responsibility: create or revision-safely update a user's training program through a repository port.
import {createTrainingProgram} from "../../domain/training/training-program.js";
import {createTrainingProgramPersistenceResult} from "./training-program-persistence-result.js";
function conflictError(){const e=new Error("Save training program: the program changed; reload it before retrying.");e.code="TRAINING_PROGRAM_CONFLICT";return e;}
function createSaveTrainingProgram({repository,clock,createId}={}){
 if(!repository||typeof repository.insertForUser!=="function"||typeof repository.findForUser!=="function"||typeof repository.updateForUser!=="function")throw new TypeError("Save training program: repository insertForUser, findForUser and updateForUser are required.");
 if(typeof clock!=="function"||typeof createId!=="function")throw new TypeError("Save training program: clock and createId dependencies are required.");
 async function execute({userContext,program,expectedRevision=0}={}){
  const userId=userContext?.userId;
  if(typeof userId!=="string"||!userId.trim())throw new TypeError("Save training program: authenticated user context is required.");
  if(!program||typeof program!=="object"||Array.isArray(program))throw new TypeError("Save training program: program input is required.");
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new TypeError("Save training program: expectedRevision must be a non-negative safe integer.");
  const scopedUserId=userId.trim(),now=clock();
  if(!Number.isFinite(now)||now<0)throw new TypeError("Save training program: clock must return a valid timestamp.");
  if(expectedRevision===0){
   const id=createId();if(typeof id!=="string"||!id.trim())throw new TypeError("Save training program: createId must return a non-empty UUID.");
   const entity=createTrainingProgram({...program,id,createdAt:now,updatedAt:now});
   const saved=createTrainingProgramPersistenceResult(await repository.insertForUser(scopedUserId,entity),entity.id);
   if(saved.revision!==1)throw new Error("Save training program: repository must start a new program at revision 1.");
   return saved;
  }
  const stored=await repository.findForUser(scopedUserId);
  if(stored==null){const e=new Error("Save training program: program was not found within the requested user scope.");e.code="TRAINING_PROGRAM_NOT_FOUND";throw e;}
  const existing=createTrainingProgramPersistenceResult(stored);
  if(existing.revision!==expectedRevision)throw conflictError();
  if(now<existing.program.updatedAt)throw new TypeError("Save training program: clock must not move the update timestamp backwards.");
  const entity=createTrainingProgram({...program,id:existing.program.id,createdAt:existing.program.createdAt,updatedAt:now});
  const updated=await repository.updateForUser(scopedUserId,entity,expectedRevision);
  if(updated==null)throw conflictError();
  const saved=createTrainingProgramPersistenceResult(updated,existing.program.id);
  if(saved.revision!==expectedRevision+1){const e=new Error("Save training program: repository did not increment revision exactly once.");e.code="TRAINING_PROGRAM_REPOSITORY_CONTRACT_VIOLATION";throw e;}
  return saved;
 }
 return Object.freeze({execute});
}
export {createSaveTrainingProgram};
