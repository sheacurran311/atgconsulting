import test from "node:test";
import assert from "node:assert/strict";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import { type AuthedRequest } from "./lib/auth";
import { createProspectingRouter } from "./routes/prospecting";

const resolve:RequestHandler=(req,_res,next)=>{
  const role=req.headers["x-role"];
  if(role==="ADMIN"||role==="CLIENT") (req as AuthedRequest).atgUser={
    id:"test-operator",role,clientId:role==="CLIENT"?"client-a":null,
    email:"operator@example.org",isImpersonating:false,impersonateAllowEdits:false
  } as never;
  next();
};
function appForTest(){const app=express();app.use(express.json());app.use("/api",createProspectingRouter(resolve));return app;}
function patchMethod(obj:object,key:string,fn:unknown,restore:Array<()=>void>){
  const record=obj as Record<string,unknown>;const original=record[key];
  record[key]=fn;restore.push(()=>{record[key]=original;});
}
test("prospecting routes reject unauthenticated and non-admin access",async()=>{
  const app=appForTest();
  assert.equal((await request(app).get("/api/admin/prospecting")).status,401);
  assert.equal((await request(app).get("/api/admin/prospecting").set("x-role","CLIENT")).status,403);
  assert.equal((await request(app).post("/api/admin/prospecting").set("x-role","CLIENT").send({businessName:"Example",website:"example.org"})).status,403);
});
test("a prospect cannot jump from NEW directly to CONTACTED",async()=>{
  const undo:Array<()=>void>=[];
  const old={id:"prospect-a",status:"NEW",updatedAt:new Date("2026-11-17T14:00:00.000Z"),reviewJson:null,outreachDraft:"",notes:"",businessName:"Example",industry:"",approvedById:null,approvedAt:null};
  patchMethod(prisma.atgProspect,"findUnique",async()=>old,undo);
  try{
    const result=await request(appForTest()).patch("/api/admin/prospecting/prospect-a")
      .set("x-role","ADMIN")
      .send({expectedUpdatedAt:old.updatedAt.toISOString(),nextStatus:"CONTACTED"});
    assert.equal(result.status,409);assert.match(result.body.error,/status transition/);
  }finally{undo.reverse().forEach(fn=>fn());}
});
test("qualified outreach generation is draft-only and stores source-backed copy",async()=>{
  const undo:Array<()=>void>=[];
  const previousFlag=process.env.AI_ASSIST_ENABLED;
  process.env.AI_ASSIST_ENABLED="false";
  const review={industryFit:5,sizeFit:5,observableNeed:5,contactConfidence:5,urgency:5,suppressed:false,
    evidence:[{claim:"The business publishes a customer appointment calendar.",sourceUrl:"https://example.org/appointments",observedAt:"2026-11-17T12:00:00.000Z",verified:true}]};
  let record={
    id:"prospect-a",status:"QUALIFIED",updatedAt:new Date("2026-11-17T14:00:00.000Z"),
    reviewJson:JSON.stringify(review),outreachDraft:"",notes:"",businessName:"Example Business",industry:"Services",
    approvedById:null as string|null,approvedAt:null as Date|null,
  };
  patchMethod(prisma.atgProspect,"findUnique",async()=>record,undo);
  patchMethod(prisma.atgProspect,"findUniqueOrThrow",async()=>record,undo);
  patchMethod(prisma.atgProspect,"updateMany",async({where,data}:any)=>{
    assert.equal(where.id,"prospect-a");assert.equal(where.status,"QUALIFIED");
    record={...record,...data,updatedAt:new Date("2026-11-17T14:00:01.000Z")};
    return {count:1};
  },undo);
  patchMethod(prisma.auditLog,"create",async()=>({id:"audit-a"}),undo);
  try {
    const res=await request(appForTest()).post("/api/admin/prospecting/prospect-a/draft")
      .set("x-role","ADMIN").send({expectedUpdatedAt:"2026-11-17T14:00:00.000Z"});
    assert.equal(res.status,200);assert.equal(res.body.status,"DRAFT_READY");
    assert.equal(res.body.draftSource,"TEMPLATE");assert.match(res.body.outreachDraft,/appointment calendar/);
    assert.equal(res.body.approvedAt,null);
    assert.equal((await request(appForTest()).post("/api/admin/prospecting/prospect-a/draft")
      .set("x-role","ADMIN").send({expectedUpdatedAt:record.updatedAt.toISOString()})).status,409);
  }finally{
    undo.reverse().forEach(fn=>fn());
    if(previousFlag===undefined)delete process.env.AI_ASSIST_ENABLED; else process.env.AI_ASSIST_ENABLED=previousFlag;
  }
});
