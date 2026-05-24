import { NextRequest } from "next/server";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const FORMATOS_PERMITIDOS = new Set(["pdf", "docx", "txt", "xlsx", "csv", "pptx"]);
const TAMANO_MAX = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (datos: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(datos)}\n\n`));
      };

      try {
        const supabase = await crearClienteServidor();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          emit({ fase: "error", error: "No autenticado" });
          return;
        }

        const formData = await request.formData();
        const archivo = formData.get("archivo") as File | null;

        if (!archivo) {
          emit({ fase: "error", error: "No se recibió archivo" });
          return;
        }
        if (archivo.size > TAMANO_MAX) {
          emit({ fase: "error", error: "El archivo supera los 10 MB" });
          return;
        }
        const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
        if (!FORMATOS_PERMITIDOS.has(extension)) {
          emit({ fase: "error", error: `Formato no soportado: .${extension}` });
          return;
        }

        emit({ fase: "extrayendo" });

        let confidencialidad = 1;
        let probabilidad: number | null = null;
        let textoExtraido: string | null = null;
        let tipoArchivo: string = extension;

        const iaUrl = process.env.SERVICIO_IA_URL;
        if (iaUrl) {
          emit({ fase: "clasificando" });
          try {
            const iaForm = new FormData();
            iaForm.append("archivo", archivo);
            const iaResp = await fetch(`${iaUrl}/procesar`, {
              method: "POST",
              body: iaForm,
              signal: AbortSignal.timeout(30_000),
            });
            if (iaResp.ok) {
              const iaData = await iaResp.json();
              confidencialidad = iaData.confidencialidad ?? 1;
              probabilidad = iaData.probabilidad ?? null;
              textoExtraido = iaData.texto_extraido ?? null;
              tipoArchivo = iaData.tipo_archivo ?? extension;
            }
          } catch {
            // fail-safe: confidencial
          }
        } else {
          emit({ fase: "clasificando" });
        }

        emit({ fase: "guardando" });

        const admin = crearClienteAdmin();
        const rutaObjeto = `${user.id}/${Date.now()}_${archivo.name}`;
        const buffer = await archivo.arrayBuffer();

        const { error: errorStorage } = await admin.storage
          .from("almacen_documentos")
          .upload(rutaObjeto, buffer, { contentType: archivo.type, upsert: false });

        if (errorStorage) {
          emit({ fase: "error", error: "Error al guardar el archivo en el almacén" });
          return;
        }

        const { data: doc, error: errorDb } = await admin
          .from("Documentos")
          .insert({
            nombre: archivo.name,
            url: rutaObjeto,
            user_id: user.id,
            confidencialidad,
            texto_extraido: textoExtraido,
            tipo_archivo: tipoArchivo,
            tamano_bytes: archivo.size,
            probabilidad,
          })
          .select("id, nombre, confidencialidad")
          .single();

        if (errorDb) {
          await admin.storage.from("almacen_documentos").remove([rutaObjeto]);
          emit({ fase: "error", error: "Error al registrar el documento" });
          return;
        }

        emit({ fase: "completado", doc });
      } catch {
        emit({ fase: "error", error: "Error interno del servidor" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
