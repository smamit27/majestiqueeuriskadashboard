export function daysInMonth(mv) {
  const [y, m] = mv.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function n(v) { return parseFloat(v) || 0; }

export function calcBill(form, mv, attData = null) {
  const totalUnits = n(form.unitsA) + n(form.unitsB) + n(form.unitsC);
  if (totalUnits === 0) return null;

  const ratioA = n(form.unitsA) / totalUnits;
  const ratioB = n(form.unitsB) / totalUnits;
  const ratioC = n(form.unitsC) / totalUnits;

  const days = daysInMonth(mv);

  // Pro-rated Wages for Buildings
  const aDays = attData ? attData.a : (form.aDays !== '' ? n(form.aDays) : days);
  const bDays = attData ? attData.b : (form.bDays !== '' ? n(form.bDays) : days);
  const cDays = attData ? attData.c : (form.cDays !== '' ? n(form.cDays) : days);

  const aWage = (n(form.aWage) / days) * aDays;
  const bWage = (n(form.bWage) / days) * bDays;
  const cWage = (n(form.cWage) / days) * cDays;

  // Supervisor
  const supWage = n(form.supervisorSalary);
  const supDays = attData ? attData.supervisor : (form.supervisorDays !== '' ? n(form.supervisorDays) : days);
  const supActualTotal = (supWage / days) * supDays;

  const supA = supActualTotal * ratioA;
  const supB = supActualTotal * ratioB;
  const supC = supActualTotal * ratioC;

  // Common Staff
  const comSalary = n(form.commonSalary);
  let comNet = comSalary;
  let comDays = days;
  if (attData) {
    comDays = attData.common;
    comNet = (comSalary / days) * comDays;
  } else if (form.commonAbsent !== '') {
    const comCount = n(form.commonCount) || 1;
    const perDay = comSalary / (comCount * days);
    const deduction = n(form.commonAbsent) * perDay;
    comNet = comSalary - deduction;
    comDays = comCount * days - n(form.commonAbsent);
  }
  const comA = comNet * ratioA;
  const comB = comNet * ratioB;
  const comC = comNet * ratioC;

  // Garbage
  const garbTotal = n(form.garbageTotal);
  const garbA = garbTotal * ratioA;
  const garbB = garbTotal * ratioB;
  const garbC = garbTotal * ratioC;

  // Tractor
  const useAttendance = attData && !form.overrideTractorTrips;
  const trips = useAttendance ? attData.tractorTrip : (form.tractorTrips !== '' ? n(form.tractorTrips) : 0);
  const tractTotal = n(form.tractorRate) * trips;
  const tractA = tractTotal * ratioA;
  const tractB = tractTotal * ratioB;
  const tractC = tractTotal * ratioC;

  // STP
  const stpTotal = n(form.stpSalary);
  const stpA = stpTotal * ratioA;
  const stpB = stpTotal * ratioB;
  const stpC = stpTotal * ratioC;

  const totalA = aWage + supA + comA + garbA + tractA + stpA;
  const totalB = bWage + supB + comB + garbB + tractB + stpB;
  const totalC = cWage + supC + comC + garbC + tractC + stpC;

  return {
    ratioA, ratioB, ratioC,
    comNet,
    tractTotal,
    usedAttendance: !!attData,
    rows: [
      { label: 'A Building', wage: aWage, sup: supA, com: comA, garb: garbA, tract: tractA, stp: stpA, total: totalA, days: aDays },
      { label: 'B Building', wage: bWage, sup: supB, com: comB, garb: garbB, tract: tractB, stp: stpB, total: totalB, days: bDays },
      { label: 'C Building', wage: cWage, sup: supC, com: comC, garb: garbC, tract: tractC, stp: stpC, total: totalC, days: cDays },
    ],
    grandTotal: totalA + totalB + totalC,
  };
}
