// source/application/training/get-training-program.js — Version 1.0
// Responsibility: retrieve and validate the authenticated user's training program through a repository port.
import {createTrainingProgramPersistenceResult} from "./training-program-persistence-result.js";
function createGetTrainingProgram({repository}={}){
 if(!repository||typeof repository.findForUser!=="function")throw new TypeError("Get training program: repository.findForUser is required.");
 async function execute({userContext}={}){
  const userId=userContext?.userId;
  if(typeof userId!=="string"||!userId.trim())throw new TypeError("Get training program: authenticated user context is required.");
  const stored=await repository.findForUser(userId.trim());
  return stored==null?null:createTrainingProgramPersistenceResult(stored);
 }
 return Object.freeze({execute});
}
export {createGetTrainingProgram};
