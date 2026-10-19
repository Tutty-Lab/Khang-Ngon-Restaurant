// ============================================================================
// „Ca dài": wer darf an einem Tag länger als die Öffnungszeit arbeiten?
//
// Nur Quản lý (Betriebsleitung) und wer mehr Stunden unterschrieben hat, als die
// freien Tage fassen (Häkchen „Ca dài tới 9h"). Dann – und nur wenn sonst Stunden
// fehlen – wird ein Tag mit Mittag + Abend zu EINEM Dienst durch die
// Mittagsschließung, mit Beginn ab 11:00 (Laden öffnet 11:30), höchstens 9 h
// bezahlt. Die Pause liegt in der Schließung.
// ============================================================================

import type { Employee } from "../types";

/** Höchste bezahlte Zeit je Tag mit „Ca dài". */
export const LONG_PAID_MINUTES = 9 * 60;
/** Frühester Dienstbeginn mit „Ca dài": 11:00. */
export const EARLY_START_MINUTES = 11 * 60;

export const isManager = (employee: Employee) => /quản lý|betriebsleit/i.test(employee.role ?? "");

export const allowsLongDays = (employee: Employee | undefined) =>
  employee != null && (employee.longShifts === true || isManager(employee));
