import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, type AuthedRequest } from "../lib/auth";
import { BusinessContextSchema, emptyBusinessContext, governanceReview } from "../lib/businessContext";
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
  if(!await prisma.client.findUnique({where:{id},select:{id:true}})){res.sendStatus(404);return;}
  const latest=await prisma.businessContextVersion.findFirst({where:{clientId:id},orderBy:{version:"desc"},select:{version:true}});
  if((latest?.version??0)!==body.data.expectedVersion){res.status(409).json({error:"Context changed. Reload before saving."});return;}
  const version=body.data.expectedVersion+1;
  const profile=BusinessContextSchema.parse({...body.data.profile,clientId:id,version});
  try{
    await prisma.businessContextVersion.create({data:{clientId:id,version,content:JSON.stringify(profile),actorUserId:actor.id}});
  }catch(e){if((e as {code?:string}).code==="P2002"){res.status(409).json({error:"Context changed. Reload before saving."});return;}throw e;}
  res.json({savedVersion:version});
});
export default router;
