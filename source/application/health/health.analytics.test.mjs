// source/application/health/health.analytics.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import {createHealthAnalytics} from "./health.analytics.js";

test("Health Analytics calculates recovery averages for a date range",async()=>{
    const now=Date.now();
    const application={async listFacts(category){
        assert.equal(category,"recovery");
        return [
            {recordedAt:now-2*86400000,sleepDurationHours:7,subjectiveRecovery:6},
            {recordedAt:now-86400000,sleepDurationHours:8,subjectiveRecovery:8},
            {recordedAt:now+86400000,sleepDurationHours:10,subjectiveRecovery:10}
        ];
    }};
    const analytics=createHealthAnalytics({healthApplication:application});
    const result=await analytics.getHealthAnalytics("recovery",{startDate:now-7*86400000,endDate:now});
    assert.equal(result.observations,2);
    assert.equal(result.metrics.sleepDurationHours.value,7.5);
    assert.equal(result.metrics.subjectiveRecovery.value,7);
});

test("Health Analytics calculates training volume",async()=>{
    const now=Date.now();
    const application={async listFacts(category){
        assert.equal(category,"activity");
        return [
            {recordedAt:now-2*86400000,type:"workout",workout:true,durationMinutes:60},
            {recordedAt:now-86400000,type:"workout",workout:true,durationMinutes:45}
        ];
    }};
    const analytics=createHealthAnalytics({healthApplication:application});
    const result=await analytics.getHealthAnalytics("training",{startDate:now-7*86400000,endDate:now});
    assert.equal(result.metrics.workoutCount.value,2);
    assert.equal(result.metrics.workoutDuration.value,105);
});
