// Mock data (fictional). Same shape as the PostgreSQL schema in README.
const P=(id,type,en,ar,spec,city,o={})=>({id,type,name:{en,ar},specialties:spec,city,er:false,secondOpinion:false,fee:null,rating:4.5,languages:["ar","en"],...o});
export const providers=[
 P("H1","hospital","Delta Heart Hospital","مستشفى دلتا للقلب",["cardiology","emergency"],"Alexandria",{er:true,rating:4.6}),
 P("H2","hospital","Nile General Hospital","مستشفى النيل العام",["emergency","internal_medicine"],"Cairo",{er:true,rating:4.3}),
 P("H3","hospital","Giza Care Center","مركز الجيزة للرعاية",["internal_medicine"],"Giza",{rating:4.1}),
 P("H4","hospital","Corniche Emergency Hospital","مستشفى الكورنيش للطوارئ",["emergency"],"Alexandria",{er:true,rating:4.4}),
 P("D1","doctor","Dr. Salma Hassan","د. سلمى حسن",["cardiology"],"Alexandria",{fee:600,secondOpinion:true,rating:4.8}),
 P("D2","doctor","Dr. Omar Farouk","د. عمر فاروق",["cardiology"],"Cairo",{fee:900,secondOpinion:true,rating:4.9}),
 P("D3","doctor","Dr. Mona Adel","د. منى عادل",["cardiology"],"Alexandria",{fee:450,rating:4.4}),
 P("D4","doctor","Dr. Karim Nabil","د. كريم نبيل",["cardiology","internal_medicine"],"Giza",{fee:500,rating:4.5}),
 P("D5","doctor","Dr. Hana Youssef","د. هناء يوسف",["internal_medicine"],"Alexandria",{fee:350,rating:4.2}),
];
export const byId=id=>providers.find(p=>p.id===id);
