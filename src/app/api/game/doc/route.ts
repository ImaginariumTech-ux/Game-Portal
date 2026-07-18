import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function parseMarkdownToHtml(md: string): string {
  const lines = md.split('\n');
  let inList = false;
  let inCode = false;
  let inTable = false;
  let codeContent = '';
  let tableRows: string[] = [];
  let htmlLines: string[] = [];

  for (let line of lines) {
    // Code block toggle
    if (line.startsWith('```')) {
      if (inCode) {
        inCode = false;
        htmlLines.push(`<pre>${codeContent.trim()}</pre>`);
        codeContent = '';
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeContent += line + '\n';
      continue;
    }

    // Table parser
    const isTableRow = line.startsWith('|');
    if (isTableRow) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
      continue;
    } else {
      if (inTable) {
        inTable = false;
        // Parse table rows
        let tableHtml = '<table>';
        tableRows.forEach((row, idx) => {
          if (row.includes('---')) return; // skip divider row
          const cols = row.split('|').map(c => c.trim()).filter((_, colIdx, arr) => colIdx > 0 && colIdx < arr.length - 1);
          const cellTag = idx === 0 ? 'th' : 'td';
          tableHtml += '<tr>' + cols.map(c => `<${cellTag}>${c}</${cellTag}>`).join('') + '</tr>';
        });
        tableHtml += '</table>';
        htmlLines.push(tableHtml);
      }
    }

    // Headers
    if (line.startsWith('# ')) {
      htmlLines.push(`<h1>${line.substring(2)}</h1>`);
    } else if (line.startsWith('## ')) {
      htmlLines.push(`<h2>${line.substring(3)}</h2>`);
    } else if (line.startsWith('### ')) {
      htmlLines.push(`<h3>${line.substring(4)}</h3>`);
    }
    // Lists
    else if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        inList = true;
        htmlLines.push('<ul>');
      }
      htmlLines.push(`<li>${line.substring(2)}</li>`);
    } else {
      if (inList) {
        inList = false;
        htmlLines.push('</ul>');
      }
      
      // Paragraph or empty line
      if (line.trim() === '') {
        htmlLines.push('<br/>');
      } else {
        htmlLines.push(`<p>${line}</p>`);
      }
    }
  }

  let finalHtml = htmlLines.join('\n');
  
  // Replace inline bold, links, inline code
  finalHtml = finalHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  finalHtml = finalHtml.replace(/`(.*?)`/g, '<code>$1</code>');
  // Simple link replacer
  finalHtml = finalHtml.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  return finalHtml;
}

export async function GET(req: Request) {
  try {
    // 1. Verify User Session and Admin privileges
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user role is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Parse Query Parameters
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');
    const format = searchParams.get('format') || 'markdown';

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId parameter' }, { status: 400 });
    }

    // 3. Fetch Game Data
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('title, slug, webhook_secret')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 4. Read Template File
    const templatePath = path.resolve(process.cwd(), 'developer-integration-template.md');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Integration template not found on server' }, { status: 500 });
    }

    let docContent = fs.readFileSync(templatePath, 'utf8');

    // 5. Determine Base URL
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseApiUrl = `${protocol}://${host}/api/game`;

    // 6. Replace Placeholders
    docContent = docContent.replace(/\[\[ GAME_TITLE \]\]/g, game.title || 'Untitled Game');
    docContent = docContent.replace(/\[\[ GAME_SLUG \]\]/g, game.slug || 'untitled-game');
    docContent = docContent.replace(/\[\[ WEBHOOK_SECRET \]\]/g, game.webhook_secret || 'Not Configured');
    
    // Replace API URL references in document (like base URL placeholders)
    docContent = docContent.replace(/https:\/\/your-portal-domain\.com\/api\/game/g, baseApiUrl);

    // Stamp Version metadata
    const stamp = `\n---\n*Generated by MagicGames Portal on ${new Date().toLocaleDateString()}*\n*Integration Spec Version: 1.0*\n`;
    docContent += stamp;

    // 7. Format-specific response
    if (format === 'word' || format === 'doc') {
      const htmlContent = parseMarkdownToHtml(docContent);
      const wordDocument = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<title>${game.title} - Integration Guide</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; }
h1 { font-size: 20pt; color: #5B21B6; margin-top: 20pt; margin-bottom: 10pt; font-weight: bold; }
h2 { font-size: 15pt; color: #4338CA; margin-top: 15pt; margin-bottom: 8pt; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 3pt; }
h3 { font-size: 12pt; color: #0f172a; margin-top: 12pt; margin-bottom: 6pt; font-weight: bold; }
p { margin-bottom: 10pt; }
ul { margin-bottom: 10pt; padding-left: 20pt; }
li { margin-bottom: 4pt; }
pre { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12pt; font-family: Consolas, Courier New, monospace; font-size: 9.5pt; color: #475569; margin-bottom: 12pt; }
code { background-color: #f1f5f9; padding: 2pt 4pt; font-family: Consolas, monospace; font-size: 9.5pt; color: #b91c1c; }
table { border-collapse: collapse; width: 100%; margin-top: 12pt; margin-bottom: 12pt; }
th, td { border: 1px solid #cbd5e1; padding: 8pt; text-align: left; vertical-align: top; }
th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
a { color: #2563eb; text-decoration: underline; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>
      `.trim();

      return new Response(wordDocument, {
        headers: {
          'Content-Type': 'application/msword; charset=utf-8',
          'Content-Disposition': `attachment; filename="${game.slug}-integration-guide.doc"`,
        }
      });
    }

    // Default: Return file download response (Markdown)
    return new Response(docContent, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${game.slug}-integration-guide.md"`,
      }
    });

  } catch (err: any) {
    console.error('Error generating developer doc:', err);
    return NextResponse.json({ error: 'Internal server error', message: err.message }, { status: 500 });
  }
}
