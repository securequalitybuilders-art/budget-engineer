import { db } from '@/db/db'
import type { ContractorProfile, SubcontractorProfile, SupplierProfile, ConsultantProfile } from '@/domain/contractor'

export async function saveContractor(contractor: ContractorProfile): Promise<void> {
  await db.contractorProfiles.put(contractor)
}

export async function getContractors(): Promise<ContractorProfile[]> {
  return db.contractorProfiles.toArray()
}

export async function getContractor(id: string): Promise<ContractorProfile | undefined> {
  return db.contractorProfiles.get(id)
}

export async function getContractorsByTrade(trade: ContractorProfile['trade']): Promise<ContractorProfile[]> {
  return db.contractorProfiles.where({ trade }).toArray()
}

export async function saveSubcontractor(sub: SubcontractorProfile): Promise<void> {
  await db.subcontractorProfiles.put(sub)
}

export async function getSubcontractors(contractorId: string): Promise<SubcontractorProfile[]> {
  return db.subcontractorProfiles.where({ contractorId }).toArray()
}

export async function saveSupplier(supplier: SupplierProfile): Promise<void> {
  await db.supplierProfiles.put(supplier)
}

export async function getSuppliers(): Promise<SupplierProfile[]> {
  return db.supplierProfiles.toArray()
}

export async function getSupplier(id: string): Promise<SupplierProfile | undefined> {
  return db.supplierProfiles.get(id)
}

export async function saveConsultant(consultant: ConsultantProfile): Promise<void> {
  await db.consultantProfiles.put(consultant)
}

export async function getConsultants(): Promise<ConsultantProfile[]> {
  return db.consultantProfiles.toArray()
}
