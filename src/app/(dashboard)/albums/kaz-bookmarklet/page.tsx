import { BookmarkletInstaller } from "./bookmarklet-installer";

const BOOKMARKLET = `javascript:(function(){var $=window.jQuery;if(!$){alert('Erro: jQuery não encontrado.');return;}var T=$('#DataTableDiagramacoes');if(!T.length){alert('Vá até a página de Diagramações do Kaz.');return;}var dt=T.DataTable();function ex(){var rows=[];T.find('tbody tr').each(function(){var tds=$(this).find('td');if(tds.length<4)return;var c=(tds.eq(1).find('[data-bs-original-title]').attr('data-bs-original-title')||tds.eq(1).text()).trim();if(!/^\d{9}$/.test(c))return;rows.push({class_code:c.slice(0,5),student_code:c.slice(5),student_name:(tds.eq(2).find('[data-bs-original-title]').attr('data-bs-original-title')||tds.eq(2).text()).trim(),faculty:(tds.eq(3).find('[data-bs-original-title]').attr('data-bs-original-title')||tds.eq(3).text()).trim()});});if(!rows.length){alert('Nenhum álbum encontrado.');return;}navigator.clipboard.writeText(JSON.stringify(rows)).then(function(){var d=document.createElement('div');d.style.cssText='position:fixed;top:20px;right:20px;background:#16a34a;color:#fff;padding:14px 20px;border-radius:10px;font-size:15px;z-index:999999;box-shadow:0 4px 16px rgba(0,0,0,.25);font-family:sans-serif';d.innerHTML='✅ '+rows.length+' álbuns copiados!<br><small>Cole no StepAlbum → Importar da Kaz<\/small>';document.body.appendChild(d);setTimeout(function(){d.remove();},4000);}).catch(function(){prompt('Copie o JSON:',JSON.stringify(rows));});}var i=dt.page.info();if(i.recordsTotal>i.length&&i.length>0){dt.one('draw',function(){setTimeout(ex,200);});dt.page.len(500).draw();}else{ex();}})();`;

export default function KazBookmarkletPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookmarklet: Kaz → StepAlbum</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Um clique na página do Kaz copia todos os álbuns direto para o clipboard.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Como instalar</h2>
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li>Copie o código abaixo usando o botão.</li>
          <li>
            Abra seus favoritos no browser e crie um novo favorito manualmente:
            <ul className="ml-5 mt-1 space-y-1 list-disc">
              <li><strong>Nome:</strong> Kaz → StepAlbum</li>
              <li><strong>URL / Endereço:</strong> cole o código copiado</li>
            </ul>
          </li>
          <li>No Chrome: barra de favoritos → clique com botão direito → <em>Adicionar página</em> → cole no campo de URL.</li>
          <li>No Firefox: barra de marcadores → clique com botão direito → <em>Novo marcador</em> → cole no campo Endereço.</li>
          <li>No Safari: <em>Favoritos → Editar favoritos</em> → clique duplo em qualquer URL → substitua pelo código.</li>
        </ol>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Código do bookmarklet</h2>
        <BookmarkletInstaller code={BOOKMARKLET} />
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Como usar</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Acesse <strong>sistema.kazformaturas.com.br/diagramacoes/dashboard</strong> e faça login.</li>
          <li>Clique no favorito <strong>Kaz → StepAlbum</strong> na barra de favoritos.</li>
          <li>
            Se houver mais de 25 álbuns, o bookmarklet carrega todos automaticamente
            (pode demorar 1-2 segundos).
          </li>
          <li>Uma notificação verde aparece confirmando quantos álbuns foram copiados.</li>
          <li>
            Volte para o StepAlbum → <strong>Álbuns → Importar da Kaz</strong> → cole (Ctrl+V / Cmd+V) → Processar.
          </li>
        </ol>
      </div>
    </div>
  );
}
