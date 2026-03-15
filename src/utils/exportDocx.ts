import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, BorderStyle,
} from 'docx';

export async function downloadDocx(doc: Document, filename: string): Promise<void> {
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportArabicDocToDocx(
  title: string,
  _recipientTitle: string,
  _recipient: string,
  body: string,
  senderName: string,
  _senderCIN: string,
  _senderAddress: string,
  city: string,
  date: string,
  filename: string
): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1418, right: 1134, bottom: 1418, left: 1134 },
          size: { width: 11906, height: 16838 },
        },
      },
      children: [
        // Title box — centered, bold, underlined
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: title, bold: true, underline: {}, size: 30, rightToLeft: true, color: '0f2744' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '◈ ◈ ◈', size: 18, color: 'C8962C' })],
        }),
        new Paragraph({ text: '' }),
        // City and Date (right aligned)
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: `${city}، بتاريخ: ${date}`, rightToLeft: true, size: 22, italics: true, color: '475569' }),
          ],
        }),
        new Paragraph({ text: '' }),
        // Body lines — each line is a paragraph
        ...body.split('\n').map(line =>
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: line, rightToLeft: true, size: 22 })],
          })
        ),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        // Signature block
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'التوقيع والاسم الكامل:', bold: true, size: 22, rightToLeft: true }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: senderName, size: 22, bold: true, rightToLeft: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: '____________________________', size: 22 })],
        }),
      ],
    }],
  });

  await downloadDocx(doc, filename);
}

export async function exportFrenchDocToDocx(
  subject: string,
  senderName: string,
  senderAddress: string,
  senderVille: string,
  senderEmail: string,
  senderPhone: string,
  recipientName: string,
  recipientTitle: string,
  recipientOrg: string,
  recipientAddress: string,
  body: string,
  date: string,
  filename: string
): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1418, right: 1134, bottom: 1418, left: 1134 },
          size: { width: 11906, height: 16838 },
        },
      },
      children: [
        // Sender block (left)
        new Paragraph({
          children: [new TextRun({ text: senderName, bold: true, size: 22 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: senderAddress, size: 20 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: senderVille, size: 20 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: senderPhone, size: 20 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: senderEmail, size: 20 })],
        }),
        new Paragraph({ text: '' }),
        // Recipient block (right)
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `${recipientTitle} ${recipientName}`, bold: true, size: 22 })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: recipientOrg, size: 20 })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: recipientAddress, size: 20 })],
        }),
        new Paragraph({ text: '' }),
        // Date
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `${senderVille}, le ${date}`, size: 20 })],
        }),
        new Paragraph({ text: '' }),
        // Subject
        new Paragraph({
          children: [
            new TextRun({ text: 'Objet : ', bold: true, underline: {}, size: 22 }),
            new TextRun({ text: subject, bold: true, size: 22 }),
          ],
        }),
        new Paragraph({ text: '' }),
        // Body
        ...body.split('\n').map(line =>
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            children: [new TextRun({ text: line, size: 22 })],
          })
        ),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Dans l\'attente d\'une réponse favorable de votre part, je vous prie d\'agréer, Madame/Monsieur, l\'expression de mes salutations distinguées.',
              size: 22,
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({ text: senderName, bold: true, size: 22 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: '___________________', size: 22 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: '(Signature)', size: 18, color: '888888' })],
        }),
      ],
    }],
  });

  await downloadDocx(doc, filename);
}

export async function exportCVToDocx(cvData: any, filename: string): Promise<void> {
  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({ text: `${cvData.prenom} ${cvData.nom}`, bold: true, size: 40, color: '1a3a5c' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${cvData.email} | ${cvData.telephone} | ${cvData.ville}`, size: 20, color: '555555' }),
      ],
    }),
    new Paragraph({ text: '' }),
  ];

  if (cvData.profil) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'PROFIL', bold: true, size: 24, color: '1a3a5c' })],
        border: { bottom: { color: 'c8962c', size: 8, space: 4, style: BorderStyle.SINGLE } },
      }),
      new Paragraph({ text: '' }),
      new Paragraph({ children: [new TextRun({ text: cvData.profil, size: 22 })], alignment: AlignmentType.JUSTIFIED }),
      new Paragraph({ text: '' }),
    );
  }

  if (cvData.experience?.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'EXPÉRIENCE PROFESSIONNELLE', bold: true, size: 24, color: '1a3a5c' })],
        border: { bottom: { color: 'c8962c', size: 8, space: 4, style: BorderStyle.SINGLE } },
      }),
      new Paragraph({ text: '' }),
    );
    cvData.experience.forEach((exp: any) => {
      children.push(
        new Paragraph({ children: [new TextRun({ text: exp.title, bold: true, size: 22 }), new TextRun({ text: ` — ${exp.company}`, size: 22, color: '555555' })] }),
        new Paragraph({ children: [new TextRun({ text: exp.period, size: 20, color: '888888', italics: true })] }),
        new Paragraph({ children: [new TextRun({ text: exp.description, size: 20 })], alignment: AlignmentType.JUSTIFIED }),
        new Paragraph({ text: '' }),
      );
    });
  }

  if (cvData.formation?.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'FORMATION', bold: true, size: 24, color: '1a3a5c' })],
        border: { bottom: { color: 'c8962c', size: 8, space: 4, style: BorderStyle.SINGLE } },
      }),
      new Paragraph({ text: '' }),
    );
    cvData.formation.forEach((edu: any) => {
      children.push(
        new Paragraph({ children: [new TextRun({ text: edu.degree, bold: true, size: 22 }), new TextRun({ text: ` — ${edu.institution}`, size: 22, color: '555555' })] }),
        new Paragraph({ children: [new TextRun({ text: edu.year, size: 20, color: '888888', italics: true })] }),
        new Paragraph({ text: '' }),
      );
    });
  }

  if (cvData.competences?.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'COMPÉTENCES', bold: true, size: 24, color: '1a3a5c' })],
        border: { bottom: { color: 'c8962c', size: 8, space: 4, style: BorderStyle.SINGLE } },
      }),
      new Paragraph({ text: '' }),
      new Paragraph({ children: [new TextRun({ text: cvData.competences.join(' • '), size: 22 })] }),
      new Paragraph({ text: '' }),
    );
  }

  if (cvData.langues?.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'LANGUES', bold: true, size: 24, color: '1a3a5c' })],
        border: { bottom: { color: 'c8962c', size: 8, space: 4, style: BorderStyle.SINGLE } },
      }),
      new Paragraph({ text: '' }),
      new Paragraph({ children: [new TextRun({ text: cvData.langues.map((l: any) => `${l.langue}: ${l.niveau}`).join(' | '), size: 22 })] }),
      new Paragraph({ text: '' }),
    );
  }

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children }],
  });
  await downloadDocx(doc, filename);
}

export async function exportResearchToDocx(research: any, filename: string): Promise<void> {
  const isAr = research.language === 'ar';
  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: research.title, bold: true, size: 36, rightToLeft: isAr })],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: isAr ? 'مقدمة' : 'Introduction', bold: true, size: 28, color: '1a3a5c', rightToLeft: isAr })],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: isAr ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: research.introduction, size: 22, rightToLeft: isAr })],
    }),
    new Paragraph({ text: '' }),
  ];

  research.sections?.forEach((sec: any, i: number) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${sec.title}`, bold: true, size: 26, color: '1a3a5c', rightToLeft: isAr })],
      }),
      new Paragraph({ text: '' }),
      new Paragraph({
        alignment: isAr ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: sec.content, size: 22, rightToLeft: isAr })],
      }),
      new Paragraph({ text: '' }),
    );
  });

  children.push(
    new Paragraph({
      children: [new TextRun({ text: isAr ? 'خاتمة' : 'Conclusion', bold: true, size: 28, color: '1a3a5c', rightToLeft: isAr })],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: isAr ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: research.conclusion, size: 22, rightToLeft: isAr })],
    }),
  );

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 1418, right: 1134, bottom: 1418, left: 1134 } } }, children }],
  });
  await downloadDocx(doc, filename);
}
