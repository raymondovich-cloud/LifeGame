// source/application/training/save-training-session.js — Version 1.0
// Responsibility: orchestrate a user-scoped training-session save through an injected repository.
import {createTrainingSession} from "../../domain/training/training-session.js";
function createSaveTrainingSession({repository,clock,createId}={}){
 if(!repository||typeof repository.saveForUser!=="function")throw new TypeError("Save training session: repository.saveForUser is required.");
 if(typeof clock!=="function"||typeof createId!=="function")throw new TypeError("Save training session: clock and createId dependencies are required.");
 async function execute({userContext,session}={}){
  const userId=userContext?.userId;
  if(typeof userId!=="string"||!userId.trim())throw new TypeError("Save training session: authenticated user context is required.");
  if(!session||typeof session!=="object")throw new TypeError("Save training session: session input is required.");
  const now=clock();if(!Number.isFinite(now)||now<0)throw new TypeError("Save training session: clock must return a valid timestamp.");
  const id=session.id||createId();if(typeof id!=="string"||!id.trim())throw new TypeError("Save training session: createId must return a non-empty string.");
  const entity=createTrainingSession({...session,id,createdAt:session.createdAt??now,updatedAt:now});
  // The concrete adapter must authorize the user and enforce tenant isolation server-side.
  return repository.saveForUser(userId.trim(),entity);
 }
 return Object.freeze({execute});
}
export {createSaveTrainingSession};
