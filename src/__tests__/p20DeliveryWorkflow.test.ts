import { describe, it, expect } from 'vitest';
import {
  createSheet, reviseSheet, signSheet,
  createPackage, addToPackage, issuePackage,
  generateTransmittalNote, generateDrawingRegister,
  createDeliveryProject, advanceIssueState, generatePackageManifestHtml,
} from '@/engine/delivery/deliveryWorkflowEngine';

describe('P20 — Professional Delivery Workflow', () => {
  describe('createSheet', () => {
    it('creates sheet with preliminary revision', () => {
      const sheet = createSheet('A-101', 'Ground Floor Plan', 'ARCH', 'Test User');
      expect(sheet.sheetNumber).toBe('A-101');
      expect(sheet.sheetTitle).toBe('Ground Floor Plan');
      expect(sheet.status).toBe('preliminary');
      expect(sheet.currentRevision).toBe('P01');
      expect(sheet.revisions).toHaveLength(1);
      expect(sheet.createdBy).toBe('Test User');
    });
  });

  describe('reviseSheet', () => {
    it('creates next revision increment', () => {
      const sheet = createSheet('A-101', 'Plan', 'ARCH', 'User');
      const revised = reviseSheet(sheet, 'Updated per review', 'User');
      expect(revised.currentRevision).toBe('P02');
      expect(revised.revisions).toHaveLength(2);
      expect(revised.status).toBe('revised');
      expect(revised.revisions[1].description).toBe('Updated per review');
    });
  });

  describe('signSheet', () => {
    it('records checker and approver', () => {
      let sheet = createSheet('A-101', 'Plan', 'ARCH', 'User');
      sheet = signSheet(sheet, 'checker', 'Checker Name');
      expect(sheet.checkedBy).toBe('Checker Name');
      sheet = signSheet(sheet, 'approver', 'Approver Name');
      expect(sheet.approvedBy).toBe('Approver Name');
    });
  });

  describe('createPackage', () => {
    it('creates draft release package', () => {
      const pkg = createPackage('p1', 'Structural Issue 1', 'issue-for-review', 'Architect');
      expect(pkg.name).toBe('Structural Issue 1');
      expect(pkg.packageType).toBe('issue-for-review');
      expect(pkg.status).toBe('draft');
      expect(pkg.contents).toHaveLength(0);
      expect(pkg.issuedBy).toBe('Architect');
    });
  });

  describe('addToPackage', () => {
    it('adds content to package', () => {
      let pkg = createPackage('p1', 'Test', 'issue-for-review', 'User');
      pkg = addToPackage(pkg, { type: 'sheet', id: 's1', name: 'Floor Plan', ref: 'A-101' });
      pkg = addToPackage(pkg, { type: 'boq', id: 'b1', name: 'Bill of Quantities', ref: 'BOQ-01' });
      expect(pkg.contents).toHaveLength(2);
      expect(pkg.contents[0].type).toBe('sheet');
      expect(pkg.contents[1].name).toBe('Bill of Quantities');
    });
  });

  describe('issuePackage', () => {
    it('marks package as issued', () => {
      const pkg = createPackage('p1', 'Test', 'issue-for-construction', 'Engineer');
      const issued = issuePackage(pkg);
      expect(issued.status).toBe('issued');
    });
  });

  describe('generateTransmittalNote', () => {
    it('generates transmittal text', () => {
      let pkg = createPackage('p1', 'Foundation Package', 'issue-for-construction', 'Eng');
      pkg = addToPackage(pkg, { type: 'sheet', id: 's1', name: 'Foundation Plan', ref: 'S-101' });
      pkg = addToPackage(pkg, { type: 'schedule', id: 's2', name: 'Rebar Schedule', ref: 'S-201' });
      const note = generateTransmittalNote(pkg);
      expect(note).toContain('TRANSMITTAL');
      expect(note).toContain('Foundation Package');
      expect(note).toContain('issue-for-construction');
      expect(note).toContain('Foundation Plan');
      expect(note).toContain('Rebar Schedule');
    });
  });

  describe('generateDrawingRegister', () => {
    it('generates register from sheets', () => {
      const sheet = createSheet('A-101', 'Ground Floor', 'ARCH', 'User');
      const register = generateDrawingRegister([sheet]);
      expect(register).toHaveLength(1);
      expect(register[0].sheetNumber).toBe('A-101');
      expect(register[0].revision).toBe('P01');
      expect(register[0].fileRef).toBe('A-101_P01');
    });
  });

  describe('createDeliveryProject', () => {
    it('creates delivery project with metadata', () => {
      const delivery = createDeliveryProject('p1', 'P-2024-001', 'Test Client', '123 Main St');
      expect(delivery.projectNumber).toBe('P-2024-001');
      expect(delivery.clientName).toBe('Test Client');
      expect(delivery.currentIssueState).toBe('draft');
      expect(delivery.sheets).toHaveLength(0);
    });
  });

  describe('advanceIssueState', () => {
    it('advances through issue states in order', () => {
      expect(advanceIssueState('draft')).toBe('in-progress');
      expect(advanceIssueState('in-progress')).toBe('for-review');
      expect(advanceIssueState('for-review')).toBe('for-construction');
      expect(advanceIssueState('for-construction')).toBe('as-built');
      expect(advanceIssueState('as-built')).toBe('as-built');
      expect(advanceIssueState('archived')).toBe('archived');
    });
  });

  describe('generatePackageManifestHtml', () => {
    it('generates manifest HTML', () => {
      let pkg = createPackage('p1', 'Test Pkg', 'issue-for-review', 'Arch');
      pkg = addToPackage(pkg, { type: 'sheet', id: 's1', name: 'Plan', ref: 'A-101' });
      pkg.checkedBy = 'Checker';
      pkg.approvedBy = 'Approver';
      pkg.transmittalNote = 'Please review and return comments.';
      const html = generatePackageManifestHtml(pkg);
      expect(html).toContain('ISSUE PACKAGE MANIFEST');
      expect(html).toContain('Test Pkg');
      expect(html).toContain('Checker');
      expect(html).toContain('Approver');
      expect(html).toContain('Please review');
    });
  });
});
