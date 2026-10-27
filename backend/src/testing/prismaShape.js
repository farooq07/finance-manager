import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';

/**
 * Contract checks for Prisma queries without a database: every field named
 * in where / select / include / orderBy must exist on the model (following
 * relations). Catches queries against fields or relations the schema doesn't
 * have — which Prisma only reports at runtime, against a real database.
 */

const MODELS = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const LOGICAL = new Set(['AND', 'OR', 'NOT']);
const LIST_REL = new Set(['some', 'every', 'none']);
const ONE_REL = new Set(['is', 'isNot']);

function fieldsOf(modelName) {
    const model = MODELS.get(modelName);
    if (!model) throw new Error(`Unknown model ${modelName}`);
    return new Map(model.fields.map((f) => [f.name, f]));
}

function checkWhere(modelName, where, path, errors) {
    if (!where || typeof where !== 'object') return;
    const fields = fieldsOf(modelName);
    for (const [key, value] of Object.entries(where)) {
        if (LOGICAL.has(key)) {
            for (const w of [].concat(value)) checkWhere(modelName, w, `${path}.${key}`, errors);
            continue;
        }
        const f = fields.get(key);
        if (!f) { errors.push(`${path}.${key} — no such field on ${modelName}`); continue; }
        if (f.kind !== 'object' || !value || typeof value !== 'object') continue;
        const keys = Object.keys(value);
        const wrapped = keys.length && keys.every((k) => LIST_REL.has(k) || ONE_REL.has(k));
        if (wrapped) for (const k of keys) checkWhere(f.type, value[k], `${path}.${key}.${k}`, errors);
        else checkWhere(f.type, value, `${path}.${key}`, errors);
    }
}

function checkProjection(modelName, proj, path, errors) {
    if (!proj || typeof proj !== 'object') return;
    const fields = fieldsOf(modelName);
    for (const [key, value] of Object.entries(proj)) {
        if (key === '_count') continue;
        const f = fields.get(key);
        if (!f) { errors.push(`${path}.${key} — no such field on ${modelName}`); continue; }
        if (f.kind === 'object' && value && typeof value === 'object') checkArgs(f.type, value, `${path}.${key}`, errors);
    }
}

function checkArgs(modelName, args, path, errors) {
    if (!args) return;
    checkWhere(modelName, args.where, `${path}.where`, errors);
    checkProjection(modelName, args.select, `${path}.select`, errors);
    checkProjection(modelName, args.include, `${path}.include`, errors);
    for (const o of [].concat(args.orderBy || [])) {
        for (const key of Object.keys(o)) {
            if (!fieldsOf(modelName).has(key)) errors.push(`${path}.orderBy.${key} — no such field on ${modelName}`);
        }
    }
}

/** Shape errors for one query (empty = valid). */
export function queryShapeErrors(modelName, args) {
    const errors = [];
    checkArgs(modelName, args, modelName, errors);
    return errors;
}

const delegateToModel = (key) => key.charAt(0).toUpperCase() + key.slice(1);

/**
 * Spy on every read method of every model; each call resolves to `empty`
 * (an array for findMany, null otherwise) and is recorded for shape checks.
 * Returns the recorded calls: [{ model, method, args }].
 */
export function recordPrismaReads() {
    const calls = [];
    for (const key of Object.keys(prisma)) {
        const model = delegateToModel(key);
        if (key.startsWith('$') || key.startsWith('_') || !MODELS.has(model)) continue;
        for (const method of ['findMany', 'findFirst', 'findUnique', 'aggregate', 'groupBy', 'count']) {
            if (typeof prisma[key]?.[method] !== 'function') continue;
            jest.spyOn(prisma[key], method).mockImplementation(async (args) => {
                calls.push({ model, method, args });
                if (method === 'findMany' || method === 'groupBy') return [];
                if (method === 'aggregate') return { _sum: {}, _max: {}, _min: {}, _count: {} };
                if (method === 'count') return 0;
                return null;
            });
        }
    }
    return calls;
}
