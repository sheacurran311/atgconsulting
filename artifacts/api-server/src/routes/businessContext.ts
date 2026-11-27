import { lockClientGovernance } from "../lib/clientGovernanceLock";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { BusinessContextSchema, emptyBusinessContext, governanceReview } from "../lib/businessContext";
import { IntelligenceSchema, evaluateIntelligence } from "../lib/consultingIntelligence";
import { transformationServices } from "../lib/transformationServices";

const router=Router();
const path="/admin/clients/:id/business-context";
const bodySchema=z.object({expectedVersion:z.number().int().nonnegative(),profile:BusinessContextSchema.omit({clientId:true,version:true})}).strict();
router.get(path,withUser,requireAdmin,async(req,res)=>{
  const actor=(req as AuthedRequest).atgUser!;
  if(actor.isImpersonating){res.sendStatus(403);return;}
  const id=String(req.params.id);
  if(!await prisma.client.findUnique({where:{id},select:{id:true}})){res.sendStatus(404);return;}
  const row=await prisma.businessContextVersion.findFirst({where:{clientId:id},orderBy:{version:"desc"}});
  const profile=row?BusinessContextSchema.parse(JSON.parse(row.content)):emptyBusinessContext(id);
  res.setHeader("Cache-Control","no-store");
  res.json({profile,savedVersion:row?.version??0,reviews:transformationServices.map(s=>({id:s.id,name:s.name,...governanceReview(profile,id,s.id)}))});
});
router.put(path,withUser,requireAdmin,async(req,res)=>{
  const actor=(req as AuthedRequest).atgUser!;
  if(actor.isImpersonating){res.sendStatus(403);return;}
  const id=String(req.params.id);
  const body=bodySchema.safeParse(req.body);
  if(!body.success){res.status(422).json({error:"Invalid context metadata or version."});return;}
  const result = await prisma.$transaction(async db => {
    if (!(await lockClientGovernance(db, id)).length) return "missing";
    const latest = await db.businessContextVersion.findFirst({where: {clientId: id}, orderBy: {version: "desc"}, select: {version: true}});
    if ((latest?.version ?? 0) !== body.data.expectedVersion) return "stale";
    const version = body.data.expectedVersion + 1;
    const profile = BusinessContextSchema.parse({...body.data.profile, clientId: id, version});
    await db.businessContextVersion.create({data: {clientId: id, version, content: JSON.stringify(profile), actorUserId: actor.id}});
    return version;
  });
  if (result === "missing") { res.sendStatus(404); return; }
  if (result === "stale") { res.status(409).json({error: "Context changed. Reload before saving."}); return; }
  res.json({savedVersion: result});
});
router.post(path+"/evaluate",withUser,requireAdmin,async(req,res)=>{
  const actor=(req as AuthedRequest).atgUser!;
  if(actor.isImpersonating){res.sendStatus(403);return;}
  const id=String(req.params.id);
  const input=IntelligenceSchema.safeParse(req.body);
  if(!input.success){res.status(422).json({error:"Invalid assessment or estimate inputs.",issues:input.error.issues});return;}
  if(!await prisma.client.findUnique({where:{id},select:{id:true}})){res.sendStatus(404);return;}
  const row=await prisma.businessContextVersion.findFirst({where:{clientId:id},orderBy:{version:"desc"}});
  const profile=row?BusinessContextSchema.parse(JSON.parse(row.content)):emptyBusinessContext(id);
  res.setHeader("Cache-Control","no-store");
  res.json({contextVersion:row?.version??0,...evaluateIntelligence(input.data,profile,id)});
});
export default router;
