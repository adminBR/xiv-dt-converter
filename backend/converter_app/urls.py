from django.urls import path
from converter_app.views import ConvertFileView, TaskStatusView, QueueStatusView, DownloadFileView

urlpatterns = [
    path('convert', ConvertFileView.as_view(), name='convert'),
    path('task/<str:task_id>/', TaskStatusView.as_view(), name='task_status'),
    path('queue-status/', QueueStatusView.as_view(), name='queue_status'),
    path('download/<str:file_hash>/<str:filename>/', DownloadFileView.as_view(), name='download_file'),
]
