{{/*
Expand the name of the chart.
*/}}
{{- define "resume-builder.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "resume-builder.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "resume-builder.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "resume-builder.labels" -}}
helm.sh/chart: {{ include "resume-builder.chart" . }}
{{ include "resume-builder.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "resume-builder.selectorLabels" -}}
app.kubernetes.io/name: {{ include "resume-builder.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "resume-builder.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "resume-builder.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend fully qualified name
*/}}
{{- define "resume-builder.backend.fullname" -}}
{{- printf "%s-backend" (include "resume-builder.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "resume-builder.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "resume-builder.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Web fully qualified name
*/}}
{{- define "resume-builder.web.fullname" -}}
{{- printf "%s-web" (include "resume-builder.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "resume-builder.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "resume-builder.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: web
{{- end }}

{{/*
MongoDB connection URI
*/}}
{{- define "resume-builder.mongodbUri" -}}
{{- printf "mongodb://%s:%s@%s-svc.%s.svc.cluster.local:27017/%s?replicaSet=%s&authSource=admin&ssl=false" .Values.mongodb.username "$(MONGODB_PASSWORD)" .Values.mongodb.name .Release.Namespace .Values.mongodb.database .Values.mongodb.name }}
{{- end }}
