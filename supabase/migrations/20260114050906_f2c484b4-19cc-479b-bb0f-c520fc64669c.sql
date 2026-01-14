-- =============================================
-- ONBOARDING DINÁMICO (Training/Exams)
-- =============================================

CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  score INTEGER,
  passed BOOLEAN,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.training_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.training_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.training_questions(id) ON DELETE CASCADE,
  selected_option_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- SIMULADOR DE AUDITORÍAS
-- =============================================

CREATE TABLE public.audit_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  simulation_type TEXT NOT NULL CHECK (simulation_type IN ('fda', 'ema', 'aemps', 'aesan')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  summary TEXT,
  risk_score INTEGER,
  total_findings INTEGER DEFAULT 0,
  critical_findings INTEGER DEFAULT 0,
  major_findings INTEGER DEFAULT 0,
  minor_findings INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.audit_simulations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'observation')),
  category TEXT NOT NULL,
  finding_title TEXT NOT NULL,
  finding_description TEXT NOT NULL,
  regulation_reference TEXT,
  recommendation TEXT NOT NULL,
  affected_area TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ANÁLISIS PREDICTIVO DE CAPAs
-- =============================================

CREATE TABLE public.predictive_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern', 'trend', 'risk', 'recommendation')),
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  pattern_details JSONB,
  affected_areas TEXT[],
  suggested_actions TEXT[],
  confidence_score INTEGER,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pattern_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_id UUID REFERENCES public.predictive_insights(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  data_points JSONB NOT NULL,
  correlation_strength DECIMAL(3,2),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_detections ENABLE ROW LEVEL SECURITY;

-- Training Sessions
CREATE POLICY "Users can view their own training sessions"
  ON public.training_sessions FOR SELECT
  USING (auth.uid() = user_id OR company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert their own training sessions"
  ON public.training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training sessions"
  ON public.training_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Training Questions
CREATE POLICY "Users can view questions for their sessions"
  ON public.training_questions FOR SELECT
  USING (session_id IN (SELECT id FROM public.training_sessions WHERE user_id = auth.uid() OR company_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "Service can insert training questions"
  ON public.training_questions FOR INSERT
  WITH CHECK (true);

-- Training Answers
CREATE POLICY "Users can view their own answers"
  ON public.training_answers FOR SELECT
  USING (session_id IN (SELECT id FROM public.training_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own answers"
  ON public.training_answers FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM public.training_sessions WHERE user_id = auth.uid()));

-- Audit Simulations
CREATE POLICY "Company members can view audit simulations"
  ON public.audit_simulations FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can create audit simulations"
  ON public.audit_simulations FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update audit simulations"
  ON public.audit_simulations FOR UPDATE
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Audit Findings
CREATE POLICY "Company members can view audit findings"
  ON public.audit_findings FOR SELECT
  USING (simulation_id IN (SELECT id FROM public.audit_simulations WHERE company_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "Service can insert audit findings"
  ON public.audit_findings FOR INSERT
  WITH CHECK (true);

-- Predictive Insights
CREATE POLICY "Company members can view predictive insights"
  ON public.predictive_insights FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update predictive insights"
  ON public.predictive_insights FOR UPDATE
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service can insert predictive insights"
  ON public.predictive_insights FOR INSERT
  WITH CHECK (true);

-- Pattern Detections
CREATE POLICY "Company members can view pattern detections"
  ON public.pattern_detections FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Service can insert pattern detections"
  ON public.pattern_detections FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_training_sessions_user ON public.training_sessions(user_id);
CREATE INDEX idx_training_sessions_document ON public.training_sessions(document_id);
CREATE INDEX idx_training_sessions_company ON public.training_sessions(company_id);
CREATE INDEX idx_audit_simulations_company ON public.audit_simulations(company_id);
CREATE INDEX idx_audit_findings_simulation ON public.audit_findings(simulation_id);
CREATE INDEX idx_predictive_insights_company ON public.predictive_insights(company_id);
CREATE INDEX idx_pattern_detections_company ON public.pattern_detections(company_id);