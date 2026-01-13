-- Create enums for roles and subscription tiers
CREATE TYPE public.app_role AS ENUM ('admin', 'quality_manager', 'quality_tech', 'regulatory', 'viewer');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'professional', 'excellence');
CREATE TYPE public.document_status AS ENUM ('draft', 'review', 'approved', 'obsolete', 'archived');

-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles (many-to-many: user can have multiple roles)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Demo codes table
CREATE TABLE public.demo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'excel', 'word')),
  version INTEGER NOT NULL DEFAULT 1,
  status document_status NOT NULL DEFAULT 'draft',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document versions for version history
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  changes_description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document owners (multiple owners per document)
CREATE TABLE public.document_owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE user_id = _user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for companies
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update their company"
  ON public.companies FOR UPDATE
  USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their company"
  ON public.user_roles FOR SELECT
  USING (
    user_id IN (
      SELECT p.user_id FROM public.profiles p 
      WHERE p.company_id = public.get_user_company_id(auth.uid())
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can manage roles in their company"
  ON public.user_roles FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') AND
    user_id IN (
      SELECT p.user_id FROM public.profiles p 
      WHERE p.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- RLS Policies for demo_codes
CREATE POLICY "Anyone can view unused demo codes for validation"
  ON public.demo_codes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can use demo codes"
  ON public.demo_codes FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_used = false);

CREATE POLICY "Admins can manage demo codes"
  ON public.demo_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their company"
  ON public.documents FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users with write access can insert documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR 
     public.has_role(auth.uid(), 'quality_manager') OR 
     public.has_role(auth.uid(), 'quality_tech'))
  );

CREATE POLICY "Users with write access can update documents"
  ON public.documents FOR UPDATE
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR 
     public.has_role(auth.uid(), 'quality_manager') OR 
     public.has_role(auth.uid(), 'quality_tech') OR
     owner_id = auth.uid())
  );

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for document_versions
CREATE POLICY "Users can view document versions in their company"
  ON public.document_versions FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users with write access can insert document versions"
  ON public.document_versions FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents 
      WHERE company_id = public.get_user_company_id(auth.uid())
    ) AND
    (public.has_role(auth.uid(), 'admin') OR 
     public.has_role(auth.uid(), 'quality_manager') OR 
     public.has_role(auth.uid(), 'quality_tech'))
  );

-- RLS Policies for document_owners
CREATE POLICY "Users can view document owners in their company"
  ON public.document_owners FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins and managers can manage document owners"
  ON public.document_owners FOR ALL
  USING (
    document_id IN (
      SELECT id FROM public.documents 
      WHERE company_id = public.get_user_company_id(auth.uid())
    ) AND
    (public.has_role(auth.uid(), 'admin') OR 
     public.has_role(auth.uid(), 'quality_manager'))
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.ms-excel']
);

-- Storage policies for documents bucket
CREATE POLICY "Users can view documents in their company"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies 
      WHERE id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users with write access can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies 
      WHERE id = public.get_user_company_id(auth.uid())
    ) AND
    (public.has_role(auth.uid(), 'admin') OR 
     public.has_role(auth.uid(), 'quality_manager') OR 
     public.has_role(auth.uid(), 'quality_tech'))
  );

CREATE POLICY "Users with write access can update documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies 
      WHERE id = public.get_user_company_id(auth.uid())
    ) AND
    (public.has_role(auth.uid(), 'admin') OR 
     public.has_role(auth.uid(), 'quality_manager') OR 
     public.has_role(auth.uid(), 'quality_tech'))
  );

CREATE POLICY "Admins can delete documents from storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies 
      WHERE id = public.get_user_company_id(auth.uid())
    ) AND
    public.has_role(auth.uid(), 'admin')
  );

-- Insert initial demo code
INSERT INTO public.demo_codes (code) VALUES ('demo');