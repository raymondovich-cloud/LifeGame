// source/application/development/development.memory.port.js — Version 1.0
const REQUIRED_METHODS=Object.freeze(["listFacts","listAllFacts","saveFact"]);
function createDevelopmentMemoryPort(memory){if(!memory)throw new Error("LifeGame Development: memory is required.");for(const m of REQUIRED_METHODS)if(typeof memory[m]!=="function")throw new Error("LifeGame Development: memory method is required: "+m);return Object.freeze({listFacts:memory.listFacts.bind(memory),listAllFacts:memory.listAllFacts.bind(memory),saveFact:memory.saveFact.bind(memory)})}
export{createDevelopmentMemoryPort};