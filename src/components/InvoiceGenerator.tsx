import React, { useState, useCallback, useEffect, useRef } from 'react';
import { saveToHistory } from '../utils/storage';
import { exportInvoiceToPDF } from '../utils/exportPdf';

interface InvoiceLine {
  id: string;
  designation: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  unit: string;
}

interface InvoiceData {
  type: 'facture' | 'devis' | 'avoir' | 'bon-commande';
  number: string;
  date: string;
  dateEcheance: string;
  emetteurNom: string;
  emetteurAdresse: string;
  emetteurVille: string;
  emetteurTelephone: string;
  emetteurEmail: string;
  emetteurICE: string;
  emetteurIF: string;
  emetteurRC: string;
  emetteurPatente: string;
  emetteurCNSS: string;
  emetteurRIB: string;
  clientNom: string;
  clientAdresse: string;
  clientVille: string;
  clientTelephone: string;
  clientEmail: string;
  clientICE: string;
  lines: InvoiceLine[];
  notes: string;
  conditionsPaiement: string;
  devise: 'MAD' | 'EUR' | 'USD';
  showTVA: boolean;
  tvaGlobal: number;
  remiseGlobal: number;
  timbreFiscal: boolean;
  timbreAmount: number;
  acompte: number;
}

const defaultLine = (): InvoiceLine => ({
  id: Math.random().toString(36).slice(2),
  designation: '',
  quantity: 1,
  unitPrice: 0,
  tvaRate: 20,
  unit: 'Unité',
});

const defaultData: InvoiceData = {
  type: 'facture',
  number: `FAC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
  date: new Date().toISOString().split('T')[0],
  dateEcheance: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  emetteurNom: '', emetteurAdresse: '', emetteurVille: '',
  emetteurTelephone: '', emetteurEmail: '',
  emetteurICE: '', emetteurIF: '', emetteurRC: '',
  emetteurPatente: '', emetteurCNSS: '', emetteurRIB: '',
  clientNom: '', clientAdresse: '', clientVille: '',
  clientTelephone: '', clientEmail: '', clientICE: '',
  lines: [defaultLine()],
  notes: '',
  conditionsPaiement: 'none',
  devise: 'MAD',
  showTVA: true,
  tvaGlobal: 20,
  remiseGlobal: 0,
  timbreFiscal: false,
  timbreAmount: 20,
  acompte: 0,
};

/* ─── NUMBER → FRENCH WORDS ─── */
const UNITS = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf',
  'dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
const TENS  = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];

function belowHundred(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n/10), u = n%10;
  if (t===7) return u===1?'soixante et onze':`soixante-${UNITS[10+u]}`;
  if (t===9) return u===0?'quatre-vingt-dix':u===1?'quatre-vingt-onze':`quatre-vingt-${UNITS[10+u]}`;
  if (u===1&&t!==8) return `${TENS[t]} et un`;
  if (u===0) return t===8?'quatre-vingts':TENS[t];
  return `${TENS[t]}-${UNITS[u]}`;
}
function belowThousand(n: number): string {
  if (n===0) return '';
  if (n<100) return belowHundred(n);
  const h=Math.floor(n/100),r=n%100;
  const hStr=h===1?'cent':`${UNITS[h]} cent${r===0&&h>1?'s':''}`;
  return r===0?hStr:`${hStr} ${belowHundred(r)}`;
}
function numberToWords(amount: number, devise='MAD'): string {
  if (isNaN(amount)||amount<0) return '';
  const intPart=Math.floor(amount);
  const centPart=Math.round((amount-intPart)*100);
  const dm:Record<string,{main:string;cents:string}> = {
    MAD:{main:'Dirham',cents:'Centime'},
    EUR:{main:'Euro',cents:'Centime'},
    USD:{main:'Dollar',cents:'Cent'},
  };
  const d=dm[devise]||dm.MAD;
  function convert(n:number):string {
    if(n===0) return 'zéro';
    let r='';
    if(n>=1e9){r+=`${belowThousand(Math.floor(n/1e9))} milliard${Math.floor(n/1e9)>1?'s':''} `;n%=1e9;}
    if(n>=1e6){r+=`${belowThousand(Math.floor(n/1e6))} million${Math.floor(n/1e6)>1?'s':''} `;n%=1e6;}
    if(n>=1000){const th=Math.floor(n/1000);r+=th===1?'mille ':`${belowThousand(th)} mille `;n%=1000;}
    if(n>0) r+=belowThousand(n);
    return r.trim();
  }
  let words=`${convert(intPart)} ${intPart>1?d.main+'s':d.main}`;
  if(centPart>0) words+=` et ${convert(centPart)} ${centPart>1?d.cents+'s':d.cents}`;
  return words.charAt(0).toUpperCase()+words.slice(1);
}

/* ─── CALCULATIONS ─── */
function calcTotals(data: InvoiceData) {
  let htTotal=0, tvaTotal=0;
  const lineDetails=data.lines.map(line=>{
    const ht=line.quantity*line.unitPrice;
    const tva=data.showTVA?ht*(line.tvaRate/100):0;
    htTotal+=ht; tvaTotal+=tva;
    return {...line,ht,tva,ttc:ht+tva};
  });
  const remiseMontant=htTotal*(data.remiseGlobal/100);
  const htApresRemise=htTotal-remiseMontant;
  const tvaApresRemise=data.showTVA?htApresRemise*(data.tvaGlobal/100):tvaTotal;
  const timbre=data.timbreFiscal?data.timbreAmount:0;
  const ttcTotal=htApresRemise+tvaApresRemise+timbre;
  const resteAPayer=ttcTotal-data.acompte;
  return {lineDetails,htTotal,tvaTotal,remiseMontant,htApresRemise,tvaApresRemise,ttcTotal,timbre,resteAPayer};
}

const fmt  = (n:number,d:string)=>`${n.toFixed(2)}${d?' '+d:''}`;
const fmtD = (d:string)=>d?new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):'';

const CONDITIONS_OPTIONS=[
  {value:'none',     label:'— Aucune condition —'},
  {value:'Paiement à réception',         label:'Paiement à réception'},
  {value:'Paiement à 30 jours',          label:'Paiement à 30 jours'},
  {value:'Paiement à 60 jours',          label:'Paiement à 60 jours'},
  {value:'Paiement à 90 jours',          label:'Paiement à 90 jours'},
  {value:'50% à la commande, 50% à la livraison', label:'50% commande / 50% livraison'},
  {value:'Virement bancaire',            label:'Virement bancaire'},
  {value:'Chèque',                       label:'Chèque'},
  {value:'Espèces',                      label:'Espèces'},
];

const TYPE_INFO={
  facture:       {label:'FACTURE',         color:'#1e40af',bg:'#dbeafe',border:'#93c5fd',icon:'🧾'},
  devis:         {label:'DEVIS',           color:'#065f46',bg:'#d1fae5',border:'#6ee7b7',icon:'📋'},
  avoir:         {label:'AVOIR',           color:'#92400e',bg:'#fef3c7',border:'#fbbf24',icon:'↩️'},
  'bon-commande':{label:'BON DE COMMANDE',color:'#6d28d9',bg:'#ede9fe',border:'#c4b5fd',icon:'📦'},
} as const;

/* Base LTR style — applied to every element in InvoicePreview */
const B: React.CSSProperties={direction:'ltr',unicodeBidi:'isolate',fontFamily:'Arial,Helvetica,sans-serif',textAlign:'left'};

function TRow({label,value,color,bold}:{label:string;value:string;color?:string;bold?:boolean}){
  return(
    <div style={{...B,display:'flex',justifyContent:'space-between',fontSize:11,color:color||'#475569',marginBottom:5}}>
      <span style={{fontWeight:bold?700:400}}>{label}</span>
      <span style={{fontFamily:'monospace',fontWeight:bold?700:500}}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   INVOICE PREVIEW  (pure presentational)
══════════════════════════════════════════════ */
interface PreviewProps{data:InvoiceData;totals:ReturnType<typeof calcTotals>;}

const InvoicePreview=React.forwardRef<HTMLDivElement,PreviewProps>(({data,totals},ref)=>{
  const ti=TYPE_INFO[data.type];
  const showCond=data.conditionsPaiement!=='none';
  return(
    <div ref={ref} dir="ltr" lang="fr"
      style={{...B,width:794,minHeight:1123,background:'#ffffff',padding:'52px 58px',
        boxSizing:'border-box',fontSize:12,color:'#1e293b',position:'relative'}}>

      {/* HEADER */}
      <div style={{...B,display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28}}>
        <div style={{...B,flex:1,paddingRight:32}}>
          <div style={{...B,fontSize:21,fontWeight:900,color:'#0f2744',letterSpacing:-0.5,marginBottom:6,lineHeight:1.2}}>
            {data.emetteurNom||<span style={{color:'#cbd5e1'}}>Nom Entreprise</span>}
          </div>
          <div style={{...B,fontSize:11,color:'#475569',lineHeight:1.9}}>
            {data.emetteurAdresse    &&<div style={B}>{data.emetteurAdresse}</div>}
            {data.emetteurVille      &&<div style={B}>{data.emetteurVille}</div>}
            {data.emetteurTelephone  &&<div style={B}>Tél : {data.emetteurTelephone}</div>}
            {data.emetteurEmail      &&<div style={B}>{data.emetteurEmail}</div>}
          </div>
          {(data.emetteurICE||data.emetteurIF||data.emetteurRC)&&(
            <div style={{...B,marginTop:8,display:'flex',flexWrap:'wrap',gap:'3px 14px'}}>
              {data.emetteurICE    &&<span style={{...B,fontSize:9,color:'#64748b'}}><b>ICE:</b> {data.emetteurICE}</span>}
              {data.emetteurIF     &&<span style={{...B,fontSize:9,color:'#64748b'}}><b>IF:</b> {data.emetteurIF}</span>}
              {data.emetteurRC     &&<span style={{...B,fontSize:9,color:'#64748b'}}><b>RC:</b> {data.emetteurRC}</span>}
              {data.emetteurPatente&&<span style={{...B,fontSize:9,color:'#64748b'}}><b>Patente:</b> {data.emetteurPatente}</span>}
              {data.emetteurCNSS   &&<span style={{...B,fontSize:9,color:'#64748b'}}><b>CNSS:</b> {data.emetteurCNSS}</span>}
            </div>
          )}
        </div>
        {/* Badge */}
        <div style={{...B,textAlign:'right',flexShrink:0}}>
          <div style={{display:'inline-block',padding:'10px 26px',background:ti.bg,borderRadius:10,border:`2px solid ${ti.border}`,marginBottom:12,direction:'ltr',unicodeBidi:'isolate'}}>
            <div style={{direction:'ltr',unicodeBidi:'isolate',fontFamily:'Arial,Helvetica,sans-serif',fontSize:22,fontWeight:900,color:ti.color,letterSpacing:2,textAlign:'center',whiteSpace:'nowrap',display:'block'}}>
              {ti.icon}&nbsp;{ti.label}
            </div>
          </div>
          <div style={{...B,fontSize:11,color:'#475569',lineHeight:2.1,textAlign:'right'}}>
            <div style={B}><span style={{color:'#94a3b8'}}>N° </span><b>{data.number}</b></div>
            <div style={B}><span style={{color:'#94a3b8'}}>Date : </span>{fmtD(data.date)}</div>
            {data.type==='facture'&&data.dateEcheance&&<div style={B}><span style={{color:'#94a3b8'}}>Échéance : </span>{fmtD(data.dateEcheance)}</div>}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div style={{height:3,background:`linear-gradient(90deg,${ti.color},${ti.bg})`,borderRadius:2,marginBottom:22}}/>

      {/* CLIENT */}
      <div style={{...B,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'14px 18px',marginBottom:22,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={B}>
          <div style={{...B,fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Facturé à / Destinataire</div>
          <div style={{...B,fontSize:15,fontWeight:800,color:'#0f2744'}}>{data.clientNom||<span style={{color:'#cbd5e1'}}>Nom du Client</span>}</div>
          <div style={{...B,fontSize:11,color:'#475569',marginTop:4,lineHeight:1.8}}>
            {data.clientAdresse   &&<div style={B}>{data.clientAdresse}</div>}
            {data.clientVille     &&<div style={B}>{data.clientVille}</div>}
            {data.clientTelephone &&<div style={B}>Tél : {data.clientTelephone}</div>}
            {data.clientEmail     &&<div style={B}>{data.clientEmail}</div>}
            {data.clientICE       &&<div style={{...B,fontSize:9,color:'#64748b',marginTop:3}}><b>ICE:</b> {data.clientICE}</div>}
          </div>
        </div>
        <div style={{...B,textAlign:'right',flexShrink:0}}>
          {showCond&&<div style={{...B,fontSize:10,color:'#475569',marginBottom:6,textAlign:'right'}}><span style={{color:'#94a3b8'}}>Conditions : </span>{data.conditionsPaiement}</div>}
          {data.type==='devis'&&<span style={{background:'#d1fae5',color:'#065f46',padding:'2px 10px',borderRadius:6,fontWeight:700,fontSize:10}}>Validité : 30 jours</span>}
        </div>
      </div>

      {/* TABLE */}
      <table style={{width:'100%',borderCollapse:'collapse',marginBottom:22,direction:'ltr'}}>
        <thead>
          <tr style={{background:ti.bg}}>
            {[
              {label:'Désignation',align:'left'  as const,w:'42%'},
              {label:'Qté',        align:'center'as const,w:'auto'},
              {label:'Unité',      align:'center'as const,w:'auto'},
              {label:'P.U. HT',   align:'right' as const,w:'auto'},
              ...(data.showTVA?[{label:'TVA',align:'center'as const,w:'auto'}]:[]),
              {label:'Total HT',  align:'right' as const,w:'auto'},
            ].map(col=>(
              <th key={col.label} style={{padding:'9px 12px',textAlign:col.align,fontSize:9,fontWeight:700,color:ti.color,textTransform:'uppercase',letterSpacing:0.5,width:col.w}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {totals.lineDetails.map((line,i)=>(
            <tr key={line.id} style={{background:i%2===0?'white':'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
              <td style={{padding:'9px 12px',fontSize:12,color:'#1e293b',fontWeight:500,textAlign:'left'}}>
                {line.designation||<span style={{color:'#cbd5e1',fontStyle:'italic'}}>Désignation…</span>}
              </td>
              <td style={{padding:'9px 8px',textAlign:'center',fontSize:12,color:'#475569'}}>{line.quantity}</td>
              <td style={{padding:'9px 8px',textAlign:'center',fontSize:10,color:'#64748b'}}>{line.unit}</td>
              <td style={{padding:'9px 8px',textAlign:'right',fontSize:11,color:'#475569',fontFamily:'monospace'}}>{fmt(line.unitPrice,'')}</td>
              {data.showTVA&&<td style={{padding:'9px 8px',textAlign:'center',fontSize:11}}>
                <span style={{background:'#dbeafe',color:'#1e40af',padding:'2px 7px',borderRadius:5,fontWeight:700}}>{line.tvaRate}%</span>
              </td>}
              <td style={{padding:'9px 12px',textAlign:'right',fontSize:12,color:'#1e293b',fontWeight:700,fontFamily:'monospace'}}>{fmt(line.ht,'')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS */}
      <div style={{...B,display:'flex',justifyContent:'flex-end',marginBottom:22}}>
        <div style={{...B,width:310}}>
          <div style={{...B,background:'#f8fafc',borderRadius:10,padding:'14px 18px',border:'1px solid #e2e8f0'}}>
            <TRow label="Total HT" value={fmt(totals.htTotal,data.devise)}/>
            {data.remiseGlobal>0&&<>
              <TRow label={`Remise (${data.remiseGlobal}%)`} value={`- ${fmt(totals.remiseMontant,data.devise)}`} color="#dc2626"/>
              <TRow label="Total HT après remise" value={fmt(totals.htApresRemise,data.devise)}/>
            </>}
            {data.showTVA&&<TRow label={`TVA (${data.tvaGlobal}%)`} value={fmt(totals.tvaApresRemise,data.devise)}/>}
            {data.timbreFiscal&&<TRow label="Timbre fiscal" value={fmt(data.timbreAmount,data.devise)}/>}
            <div style={{height:1,background:'#cbd5e1',margin:'10px 0'}}/>
            <div style={{...B,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:14,fontWeight:800,color:'#0f2744'}}>TOTAL TTC</span>
              <span style={{fontSize:18,fontWeight:900,color:ti.color,fontFamily:'monospace'}}>{fmt(totals.ttcTotal,data.devise)}</span>
            </div>
            {data.acompte>0&&<>
              <div style={{height:1,background:'#e2e8f0',margin:'8px 0'}}/>
              <TRow label="Acompte versé" value={`- ${fmt(data.acompte,data.devise)}`} color="#059669"/>
              <div style={{...B,display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                <span style={{fontSize:13,fontWeight:800,color:'#dc2626'}}>RESTE À PAYER</span>
                <span style={{fontSize:16,fontWeight:900,color:'#dc2626',fontFamily:'monospace'}}>{fmt(totals.resteAPayer,data.devise)}</span>
              </div>
            </>}
          </div>
        </div>
      </div>

      {/* AMOUNT IN WORDS */}
      <div style={{...B,background:ti.bg,border:`1.5px solid ${ti.border}`,borderRadius:10,padding:'13px 18px',marginBottom:22}}>
        <div style={{...B,fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>
          Arrêté la présente {ti.label} à la somme de :
        </div>
        <div style={{...B,fontSize:13,fontWeight:700,color:ti.color,fontStyle:'italic'}}>
          {numberToWords(totals.ttcTotal,data.devise)}
        </div>
      </div>

      {/* NOTES */}
      {data.notes&&(
        <div style={{...B,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 16px',marginBottom:22}}>
          <div style={{...B,fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>Notes</div>
          <div style={{...B,fontSize:11,color:'#475569',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{data.notes}</div>
        </div>
      )}

      {/* DEVIS signature */}
      {data.type==='devis'&&(
        <div style={{...B,border:'1.5px dashed #6ee7b7',borderRadius:10,padding:'14px 18px',marginBottom:22}}>
          <div style={{...B,fontSize:11,fontWeight:700,color:'#065f46',marginBottom:18}}>Bon pour accord :</div>
          <div style={{...B,display:'flex',gap:40}}>
            <div style={B}>
              <div style={{...B,fontSize:9,color:'#94a3b8',marginBottom:20}}>Date :</div>
              <div style={{borderTop:'1px solid #cbd5e1',paddingTop:4,width:120,fontSize:9,color:'#94a3b8'}}>Date</div>
            </div>
            <div style={B}>
              <div style={{...B,fontSize:9,color:'#94a3b8',marginBottom:20}}>Signature et cachet :</div>
              <div style={{borderTop:'1px solid #cbd5e1',paddingTop:4,width:180,fontSize:9,color:'#94a3b8'}}>Signature</div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{...B,marginTop:32,paddingTop:12,borderTop:'1px solid #e2e8f0',fontSize:9,color:'#94a3b8',textAlign:'center',lineHeight:1.8}}>
        {[data.emetteurRIB&&`RIB : ${data.emetteurRIB}`,
          data.emetteurCNSS&&`CNSS : ${data.emetteurCNSS}`,
          showCond&&`Conditions : ${data.conditionsPaiement}`
        ].filter(Boolean).join('  •  ')}
      </div>
    </div>
  );
});
InvoicePreview.displayName='InvoicePreview';

/* ══════════════════════════════════════════════
   WORD EXPORT
══════════════════════════════════════════════ */
async function exportInvoiceWord(data:InvoiceData,totals:ReturnType<typeof calcTotals>):Promise<void>{
  const {Document,Packer,Paragraph,Table,TableRow,TableCell,TextRun,AlignmentType,BorderStyle,HeadingLevel,WidthType}=await import('docx');
  const ti=TYPE_INFO[data.type];
  const bdr={top:{style:BorderStyle.SINGLE,size:1,color:'CCCCCC'},bottom:{style:BorderStyle.SINGLE,size:1,color:'CCCCCC'},left:{style:BorderStyle.SINGLE,size:1,color:'CCCCCC'},right:{style:BorderStyle.SINGLE,size:1,color:'CCCCCC'}};
  const cell=(txt:string,bold=false,align:typeof AlignmentType[keyof typeof AlignmentType]=AlignmentType.LEFT)=>new TableCell({borders:bdr,children:[new Paragraph({alignment:align,children:[new TextRun({text:txt,bold,font:'Arial',size:20})]})]});

  const headerCols=['Désignation','Qté','Unité','P.U. HT',...(data.showTVA?['TVA']:[]  ),'Total HT'];
  const headerRow=new TableRow({children:headerCols.map(h=>cell(h,true,AlignmentType.CENTER))});
  const dataRows=totals.lineDetails.map(l=>new TableRow({children:[
    cell(l.designation),
    cell(String(l.quantity),false,AlignmentType.CENTER),
    cell(l.unit,false,AlignmentType.CENTER),
    cell(fmt(l.unitPrice,''),false,AlignmentType.RIGHT),
    ...(data.showTVA?[cell(`${l.tvaRate}%`,false,AlignmentType.CENTER)]:[]),
    cell(fmt(l.ht,''),true,AlignmentType.RIGHT),
  ]}));

  const doc=new Document({sections:[{children:[
    new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:ti.label,bold:true,font:'Arial',size:48,color:ti.color.replace('#','')})]}),
    new Paragraph({children:[new TextRun({text:`N° ${data.number}  |  Date : ${fmtD(data.date)}`,font:'Arial',size:20})]}),
    new Paragraph({children:[new TextRun({text:'',font:'Arial'})]}),
    new Paragraph({children:[new TextRun({text:`Émetteur : ${data.emetteurNom}`,bold:true,font:'Arial',size:22})]}),
    new Paragraph({children:[new TextRun({text:`${data.emetteurAdresse} ${data.emetteurVille}`,font:'Arial',size:20})]}),
    new Paragraph({children:[new TextRun({text:'',font:'Arial'})]}),
    new Paragraph({children:[new TextRun({text:`Client : ${data.clientNom}`,bold:true,font:'Arial',size:22})]}),
    new Paragraph({children:[new TextRun({text:`${data.clientAdresse} ${data.clientVille}`,font:'Arial',size:20})]}),
    new Paragraph({children:[new TextRun({text:'',font:'Arial'})]}),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[headerRow,...dataRows]}),
    new Paragraph({children:[new TextRun({text:'',font:'Arial'})]}),
    new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:`Total HT : ${fmt(totals.htTotal,data.devise)}`,font:'Arial',size:20})]}),
    ...(data.showTVA?[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:`TVA ${data.tvaGlobal}% : ${fmt(totals.tvaApresRemise,data.devise)}`,font:'Arial',size:20})]})]:[]),
    new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:`TOTAL TTC : ${fmt(totals.ttcTotal,data.devise)}`,bold:true,font:'Arial',size:28})]}),
    new Paragraph({children:[new TextRun({text:'',font:'Arial'})]}),
    new Paragraph({children:[new TextRun({text:numberToWords(totals.ttcTotal,data.devise),italics:true,font:'Arial',size:20})]}),
  ]}]});

  const blob=await Packer.toBlob(doc);
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`${data.type}-${data.number}.docx`; a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════
   FORM HELPER COMPONENTS
══════════════════════════════════════════════ */
function FInput({label,value,onChange,placeholder,type='text'}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;type?:string}){
  return(
    <div style={{marginBottom:8}}>
      <label style={{fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',background:'white',boxSizing:'border-box',direction:'ltr',fontFamily:'Arial,sans-serif'}}/>
    </div>
  );
}
function Section({title,icon,children}:{title:string;icon:string;children:React.ReactNode}){
  return(
    <div style={{marginBottom:16,background:'white',borderRadius:10,padding:'14px 16px',border:'1px solid #e2e8f0'}}>
      <div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function InvoiceGenerator(){
  const [data,setData]           =useState<InvoiceData>(defaultData);
  const [formSection,setSection] =useState<'emetteur'|'client'|'lignes'|'options'>('emetteur');
  const [exporting,setExporting] =useState(false);
  const [exportMsg,setMsg]       =useState('');
  const previewRef               =useRef<HTMLDivElement>(null);
  const totals                   =calcTotals(data);
  const ti                       =TYPE_INFO[data.type];

  useEffect(()=>{
    if(!exportMsg) return;
    const t=setTimeout(()=>setMsg(''),5000);
    return()=>clearTimeout(t);
  },[exportMsg]);

  const update=useCallback(<K extends keyof InvoiceData>(k:K,v:InvoiceData[K])=>{
    setData(p=>({...p,[k]:v}));
  },[]);

  const addLine   =()=>setData(p=>({...p,lines:[...p.lines,defaultLine()]}));
  const removeLine=(id:string)=>setData(p=>({...p,lines:p.lines.filter(l=>l.id!==id)}));
  const updateLine=(id:string,k:keyof InvoiceLine,v:string|number)=>
    setData(p=>({...p,lines:p.lines.map(l=>l.id===id?{...l,[k]:v}:l)}));

  /* ── PDF EXPORT ── */
  async function handleExportPDF(){
    if(exporting) return;
    const node=previewRef.current;
    if(!node){setMsg('❌ Aperçu introuvable'); return;}
    setExporting(true);
    setMsg('⏳ Génération PDF en cours…');
    try{
      const safeClient=(data.clientNom||'client')
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_-]/g,'');
      const filename=`${data.type}-${data.number}-${safeClient}`;
      await exportInvoiceToPDF(node,filename);
      setMsg('✅ PDF exporté avec succès');
      saveToHistory({type:data.type,title:`${ti.label} — ${data.clientNom||'Client'}`,module:'invoice-generator'});
    }catch(e){
      console.error(e);
      setMsg('❌ Erreur export PDF');
    }
    setExporting(false);
  }

  /* ── WORD EXPORT ── */
  async function handleExportWord(){
    if(exporting) return;
    setExporting(true);
    setMsg('⏳ Génération Word en cours…');
    try{
      await exportInvoiceWord(data,totals);
      setMsg('✅ Word exporté avec succès');
    }catch(e){
      console.error(e);
      setMsg('❌ Erreur export Word');
    }
    setExporting(false);
  }

  /* ── TABS ── */
  const FORM_TABS=[
    {id:'emetteur' as const,label:'Émetteur',icon:'🏢'},
    {id:'client'   as const,label:'Client',  icon:'👤'},
    {id:'lignes'   as const,label:'Lignes',  icon:'📋'},
    {id:'options'  as const,label:'Options', icon:'⚙️'},
  ];

  const TYPE_TABS=[
    {id:'facture'       as const,label:'Facture',        icon:'🧾'},
    {id:'devis'         as const,label:'Devis',          icon:'📋'},
    {id:'avoir'         as const,label:'Avoir',          icon:'↩️'},
    {id:'bon-commande'  as const,label:'Bon commande',   icon:'📦'},
  ];

  return(
    <div className="animate-fadeIn" style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* TOP BAR */}
      <div style={{padding:'10px 24px',borderBottom:'1px solid #e2e8f0',background:'white',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <span style={{fontSize:20}}>🧾</span>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:'#0f2744'}}>Factures & Devis</div>
          <div style={{fontSize:11,color:'#64748b',fontFamily:'Inter,sans-serif'}}>Générateur de documents commerciaux</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          {TYPE_TABS.map(t=>(
            <button key={t.id} onClick={()=>update('type',t.id)}
              style={{padding:'5px 14px',borderRadius:20,border:`1.5px solid ${data.type===t.id?ti.border:'#e2e8f0'}`,
                background:data.type===t.id?ti.bg:'white',color:data.type===t.id?ti.color:'#64748b',
                fontWeight:700,fontSize:11,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* LEFT PANEL */}
        <div style={{width:340,borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column',overflow:'hidden',background:'#f8fafc'}}>

          {/* Section tabs */}
          <div style={{display:'flex',borderBottom:'1px solid #e2e8f0',background:'white',flexShrink:0}}>
            {FORM_TABS.map(tab=>(
              <button key={tab.id} onClick={()=>setSection(tab.id)}
                style={{flex:1,padding:'8px 4px',border:'none',borderBottom:`2px solid ${formSection===tab.id?ti.color:'transparent'}`,
                  background:'white',cursor:'pointer',fontSize:10,fontWeight:700,display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                  color:formSection===tab.id?ti.color:'#64748b',transition:'all 0.15s'}}>
                <span style={{fontSize:14}}>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* Form body */}
          <div style={{flex:1,overflowY:'auto',padding:'16px 14px'}}>

            {formSection==='emetteur'&&<>
              <Section title="Informations de l'Émetteur" icon="🏢">
                <FInput label="Nom / Raison sociale" value={data.emetteurNom}      onChange={v=>update('emetteurNom',v)}      placeholder="SARL Mon Entreprise"/>
                <FInput label="Adresse"               value={data.emetteurAdresse}  onChange={v=>update('emetteurAdresse',v)}  placeholder="123, Rue Mohammed V"/>
                <FInput label="Ville"                 value={data.emetteurVille}    onChange={v=>update('emetteurVille',v)}    placeholder="Casablanca"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <FInput label="Téléphone" value={data.emetteurTelephone} onChange={v=>update('emetteurTelephone',v)} placeholder="+212 6 00 00 00"/>
                  <FInput label="Email"     value={data.emetteurEmail}     onChange={v=>update('emetteurEmail',v)}     placeholder="contact@mail.ma"/>
                </div>
              </Section>
              <Section title="Informations Fiscales" icon="🏦">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <FInput label="ICE"        value={data.emetteurICE}     onChange={v=>update('emetteurICE',v)}     placeholder="000000000000000"/>
                  <FInput label="IF"         value={data.emetteurIF}      onChange={v=>update('emetteurIF',v)}      placeholder="12345678"/>
                  <FInput label="RC"         value={data.emetteurRC}      onChange={v=>update('emetteurRC',v)}      placeholder="12345"/>
                  <FInput label="Patente"    value={data.emetteurPatente} onChange={v=>update('emetteurPatente',v)} placeholder="12345678"/>
                  <FInput label="CNSS"       value={data.emetteurCNSS}    onChange={v=>update('emetteurCNSS',v)}    placeholder="1234567"/>
                  <FInput label="RIB / IBAN" value={data.emetteurRIB}     onChange={v=>update('emetteurRIB',v)}     placeholder="007 123 456 789"/>
                </div>
              </Section>
            </>}

            {formSection==='client'&&<>
              <Section title="Informations du Client" icon="👤">
                <FInput label="Nom / Raison sociale" value={data.clientNom}       onChange={v=>update('clientNom',v)}       placeholder="Client SA"/>
                <FInput label="Adresse"               value={data.clientAdresse}   onChange={v=>update('clientAdresse',v)}   placeholder="Avenue Hassan II"/>
                <FInput label="Ville"                 value={data.clientVille}     onChange={v=>update('clientVille',v)}     placeholder="Rabat"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <FInput label="Téléphone" value={data.clientTelephone} onChange={v=>update('clientTelephone',v)} placeholder="+212 6 00 00 00"/>
                  <FInput label="Email"     value={data.clientEmail}     onChange={v=>update('clientEmail',v)}     placeholder="client@mail.com"/>
                </div>
                <FInput label="ICE Client" value={data.clientICE} onChange={v=>update('clientICE',v)} placeholder="000000000000000"/>
              </Section>
              <Section title="Conditions" icon="📅">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                  <FInput label="Date d'échéance" value={data.dateEcheance} onChange={v=>update('dateEcheance',v)} type="date"/>
                  <div>
                    <label style={{fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>Devise</label>
                    <select value={data.devise} onChange={e=>update('devise',e.target.value as 'MAD'|'EUR'|'USD')}
                      style={{width:'100%',padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',background:'white',direction:'ltr'}}>
                      <option value="MAD">MAD — Dirham</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="USD">USD — Dollar</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>
                    Conditions de paiement
                  </label>
                  <select value={data.conditionsPaiement} onChange={e=>update('conditionsPaiement',e.target.value)}
                    style={{width:'100%',padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',background:'white',direction:'ltr'}}>
                    {CONDITIONS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {data.conditionsPaiement==='none'&&<div style={{marginTop:6,fontSize:10,color:'#94a3b8',fontStyle:'italic'}}>ℹ️ Aucune condition ne sera affichée sur la facture.</div>}
                </div>
              </Section>
            </>}

            {formSection==='lignes'&&<>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <span style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>Lignes de la {ti.label}</span>
                <button onClick={addLine}
                  style={{padding:'6px 14px',background:`linear-gradient(135deg,${ti.color},${ti.color}cc)`,color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                  + Ajouter
                </button>
              </div>
              {data.lines.map((line,idx)=>(
                <div key={line.id} style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:10,padding:12,marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                    <span style={{width:22,height:22,borderRadius:'50%',background:ti.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{idx+1}</span>
                    <input value={line.designation} onChange={e=>updateLine(line.id,'designation',e.target.value)}
                      placeholder="Désignation du produit / service…"
                      style={{flex:1,padding:'6px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',background:'white',direction:'ltr'}}/>
                    {data.lines.length>1&&<button onClick={()=>removeLine(line.id)}
                      style={{padding:'4px 8px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:700}}>✕</button>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
                    {[
                      {label:'QTÉ',   el:<input type="number" value={line.quantity}  onChange={e=>updateLine(line.id,'quantity', parseFloat(e.target.value)||0)} style={{width:'100%',padding:'5px 8px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12,outline:'none',boxSizing:'border-box' as const,direction:'ltr'}}/>},
                      {label:'P.U HT',el:<input type="number" value={line.unitPrice} onChange={e=>updateLine(line.id,'unitPrice',parseFloat(e.target.value)||0)} style={{width:'100%',padding:'5px 8px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12,outline:'none',boxSizing:'border-box' as const,direction:'ltr'}}/>},
                      {label:'TVA %', el:<select value={line.tvaRate} onChange={e=>updateLine(line.id,'tvaRate',parseFloat(e.target.value))} style={{width:'100%',padding:'5px 8px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12,outline:'none',direction:'ltr'}}>{[0,7,10,14,20].map(r=><option key={r} value={r}>{r}%</option>)}</select>},
                      {label:'UNITÉ', el:<select value={line.unit}    onChange={e=>updateLine(line.id,'unit',e.target.value)} style={{width:'100%',padding:'5px 8px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12,outline:'none',direction:'ltr'}}>{'Unité,Heure,Jour,Mois,Forfait,Mètre,m²,Kg,Litre,Pièce'.split(',').map(u=><option key={u}>{u}</option>)}</select>},
                    ].map(({label,el})=>(
                      <div key={label}>
                        <label style={{fontSize:9,color:'#64748b',display:'block',marginBottom:2,fontWeight:600}}>{label}</label>
                        {el}
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:7,textAlign:'right',direction:'ltr'}}>
                    <span style={{fontSize:10,color:'#64748b'}}>HT: </span>
                    <span style={{fontSize:13,fontWeight:700,color:ti.color}}>{fmt(line.quantity*line.unitPrice,data.devise)}</span>
                    {data.showTVA&&<span style={{fontSize:10,color:'#64748b',marginLeft:6}}>TTC: {fmt(line.quantity*line.unitPrice*(1+line.tvaRate/100),data.devise)}</span>}
                  </div>
                </div>
              ))}
              <div style={{marginTop:14}}>
                <label style={{fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Notes / Observations</label>
                <textarea value={data.notes} onChange={e=>update('notes',e.target.value)}
                  placeholder="Remarques, conditions particulières…"
                  style={{width:'100%',padding:'8px 10px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:12,outline:'none',resize:'vertical',minHeight:70,boxSizing:'border-box',fontFamily:'Arial,sans-serif',direction:'ltr'}}/>
              </div>
            </>}

            {formSection==='options'&&<>
              <Section title="TVA et Remise" icon="💹">
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <input type="checkbox" id="showtva" checked={data.showTVA} onChange={e=>update('showTVA',e.target.checked)} style={{width:16,height:16}}/>
                  <label htmlFor="showtva" style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>Afficher la TVA</label>
                </div>
                {data.showTVA&&<div style={{marginBottom:12}}>
                  <label style={{fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:6,textTransform:'uppercase'}}>Taux TVA global</label>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[0,7,10,14,20].map(rate=>(
                      <button key={rate}
                        onClick={()=>{update('tvaGlobal',rate);setData(p=>({...p,lines:p.lines.map(l=>({...l,tvaRate:rate}))}));}}
                        style={{padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,
                          background:data.tvaGlobal===rate?ti.color:'#f1f5f9',color:data.tvaGlobal===rate?'white':'#475569'}}>
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>}
                <div>
                  <label style={{fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4,textTransform:'uppercase'}}>Remise globale (%)</label>
                  <input type="number" value={data.remiseGlobal} onChange={e=>update('remiseGlobal',parseFloat(e.target.value)||0)} min={0} max={100}
                    style={{width:'100%',padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',background:'white',boxSizing:'border-box',direction:'ltr'}}/>
                </div>
              </Section>
              <Section title="Options Supplémentaires" icon="➕">
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <input type="checkbox" id="timbre" checked={data.timbreFiscal} onChange={e=>update('timbreFiscal',e.target.checked)} style={{width:16,height:16}}/>
                  <label htmlFor="timbre" style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>Timbre fiscal</label>
                  {data.timbreFiscal&&<>
                    <input type="number" value={data.timbreAmount} onChange={e=>update('timbreAmount',parseFloat(e.target.value)||0)}
                      style={{width:80,padding:'4px 8px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12,outline:'none',direction:'ltr'}}/>
                    <span style={{fontSize:11,color:'#64748b'}}>{data.devise}</span>
                  </>}
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4,textTransform:'uppercase'}}>Acompte versé ({data.devise})</label>
                  <input type="number" value={data.acompte} onChange={e=>update('acompte',parseFloat(e.target.value)||0)} min={0}
                    style={{width:'100%',padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',background:'white',boxSizing:'border-box',direction:'ltr'}}/>
                </div>
              </Section>

              {/* Recap */}
              <div style={{background:ti.bg,border:`1px solid ${ti.border}`,borderRadius:10,padding:'14px 16px'}}>
                <div style={{fontSize:11,fontWeight:700,color:ti.color,marginBottom:10}}>📊 Récapitulatif</div>
                {[
                  {label:'Total HT',         val:fmt(totals.htTotal,data.devise)},
                  ...(data.remiseGlobal>0?[{label:`Remise ${data.remiseGlobal}%`,val:`- ${fmt(totals.remiseMontant,data.devise)}`}]:[]),
                  ...(data.showTVA?[{label:`TVA ${data.tvaGlobal}%`,val:fmt(totals.tvaApresRemise,data.devise)}]:[]),
                  ...(data.timbreFiscal?[{label:'Timbre',val:fmt(data.timbreAmount,data.devise)}]:[]),
                ].map(({label,val})=>(
                  <div key={label} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#475569',marginBottom:4,direction:'ltr'}}>
                    <span>{label}</span><span style={{fontFamily:'monospace',fontWeight:600}}>{val}</span>
                  </div>
                ))}
                <div style={{borderTop:`1px solid ${ti.border}`,marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',direction:'ltr'}}>
                  <span style={{fontSize:13,fontWeight:800,color:ti.color}}>TOTAL TTC</span>
                  <span style={{fontSize:15,fontWeight:900,color:ti.color,fontFamily:'monospace'}}>{fmt(totals.ttcTotal,data.devise)}</span>
                </div>
              </div>
            </>}
          </div>

          {/* EXPORT BUTTONS */}
          <div style={{padding:'12px 14px',borderTop:'1px solid #e2e8f0',flexShrink:0,background:'white'}}>
            {exportMsg&&(
              <div style={{marginBottom:8,padding:'7px 12px',borderRadius:7,fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:6,
                background:exportMsg.startsWith('✅')?'#d1fae5':exportMsg.startsWith('⏳')?'#dbeafe':'#fee2e2',
                color:      exportMsg.startsWith('✅')?'#065f46':exportMsg.startsWith('⏳')?'#1e40af':'#dc2626'}}>
                {exportMsg}
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button onClick={handleExportPDF} disabled={exporting}
                style={{flex:2,padding:'11px',background:exporting?'#93c5fd':`linear-gradient(135deg,${ti.color},${ti.color}bb)`,
                  color:'white',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:exporting?'not-allowed':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                {exporting?<>⏳ En cours…</>:<>📄 Exporter PDF</>}
              </button>
              <button onClick={handleExportWord} disabled={exporting}
                style={{flex:1,padding:'11px',background:exporting?'#93c5fd':'#1d4ed8',color:'white',border:'none',
                  borderRadius:9,fontSize:12,fontWeight:600,cursor:exporting?'not-allowed':'pointer',opacity:exporting?0.7:1}}>
                📝 Word
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — LIVE PREVIEW */}
        <div style={{flex:1,overflow:'auto',padding:'28px 32px',display:'flex',flexDirection:'column',alignItems:'center',direction:'ltr',background:'#f1f5f9'}}>
          <div style={{width:794,marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:11,color:'#64748b',fontWeight:500,fontFamily:'Inter,sans-serif'}}>Aperçu A4 — Temps réel</span>
              <span style={{background:ti.bg,color:ti.color,padding:'2px 12px',borderRadius:20,fontSize:10,fontWeight:700,border:`1px solid ${ti.border}`}}>{ti.icon} {ti.label}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:10,color:'#94a3b8',fontFamily:'Inter,sans-serif'}}>Total TTC :</span>
              <span style={{fontSize:15,fontWeight:800,color:ti.color,fontFamily:'monospace'}}>{fmt(totals.ttcTotal,data.devise)}</span>
            </div>
          </div>
          <div style={{boxShadow:'0 8px 40px rgba(0,0,0,0.18)',borderRadius:2,background:'white'}}>
            <InvoicePreview ref={previewRef} data={data} totals={totals}/>
          </div>
        </div>
      </div>
    </div>
  );
}
