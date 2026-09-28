from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

# ============================================================
# Django Admin Branding
# ============================================================
admin.site.site_header = 'InsightFlow Administration'
admin.site.site_title = 'InsightFlow Admin'
admin.site.index_title = 'InsightFlow — Intelligent Workflow Analytics'

def api_root(request):
    return HttpResponse("""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>InsightFlow — API Server</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background: #0b1120; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
        .card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 36px; max-width: 540px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: center; }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 6px 14px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 20px; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge::before { content: ''; width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #10b981; }
        h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 10px; color: #ffffff; }
        p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 28px; }
        .btn-primary { display: block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-weight: 600; font-size: 1rem; transition: transform 0.15s, box-shadow 0.15s; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6); }
        .btn-secondary { display: block; background: rgba(255, 255, 255, 0.05); color: #cbd5e1; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 500; font-size: 0.9rem; border: 1px solid rgba(255, 255, 255, 0.1); transition: background 0.15s; }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
        .footer { margin-top: 24px; font-size: 0.8rem; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Django Backend API Active</div>
        <h1>InsightFlow API Server</h1>
        <p>You have reached the backend API server (port 8000). To access the full web application interface, open the frontend app running on Vite.</p>
        <a href="http://localhost:5173" class="btn-primary">👉 Open InsightFlow Web App (localhost:5173)</a>
        <a href="/admin/" class="btn-secondary">⚙️ Django Administration (/admin/)</a>
        <div class="footer">API base mounted at <code>/api/v1/</code></div>
      </div>
    </body>
    </html>
    """)

urlpatterns = [
    path('', api_root, name='api-root-landing'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.v1.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
