import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Github, GitBranch, FolderOpen } from 'lucide-react';
import { MarketplaceAddRequest } from '../../types/plugins';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../ui/select';

interface AddMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (request: MarketplaceAddRequest) => void;
  isAdding: boolean;
}

export const AddMarketplaceModal: React.FC<AddMarketplaceModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  isAdding,
}) => {
  const { t } = useTranslation('pages');
  const [formData, setFormData] = useState<MarketplaceAddRequest>({
    name: '',
    type: 'github',
    source: '',
    description: '',
    branch: 'main',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'github',
      source: '',
      description: '',
      branch: 'main',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('plugins.marketplaces.addModal.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t('plugins.marketplaces.addModal.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('plugins.marketplaces.addModal.namePlaceholder')}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">{t('plugins.marketplaces.addModal.type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, type: value as 'git' | 'github' | 'local' })
                }
              >
                <SelectTrigger>
                  <div className="flex items-center space-x-2">
                    {formData.type === 'github' && (
                      <>
                        <Github className="w-4 h-4" />
                        <span>GitHub</span>
                      </>
                    )}
                    {formData.type === 'git' && (
                      <>
                        <GitBranch className="w-4 h-4" />
                        <span>Git Repository</span>
                      </>
                    )}
                    {formData.type === 'local' && (
                      <>
                        <FolderOpen className="w-4 h-4" />
                        <span>Local Directory</span>
                      </>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="github">
                    <div className="flex items-center space-x-2">
                      <Github className="w-4 h-4" />
                      <span>GitHub</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="git">
                    <div className="flex items-center space-x-2">
                      <GitBranch className="w-4 h-4" />
                      <span>Git Repository</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="local">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="w-4 h-4" />
                      <span>Local Directory</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="source">{t('plugins.marketplaces.addModal.source')}</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder={
                  formData.type === 'local'
                    ? t('plugins.marketplaces.addModal.sourcePlaceholderLocal')
                    : formData.type === 'github'
                    ? t('plugins.marketplaces.addModal.sourcePlaceholderGithub')
                    : t('plugins.marketplaces.addModal.sourcePlaceholderGit')
                }
                required
              />
            </div>

            {(formData.type === 'git' || formData.type === 'github') && (
              <div>
                <Label htmlFor="branch">{t('plugins.marketplaces.addModal.branch')}</Label>
                <Input
                  id="branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  placeholder={t('plugins.marketplaces.addModal.branchPlaceholder')}
                />
              </div>
            )}

            <div>
              <Label htmlFor="description">{t('plugins.marketplaces.addModal.description')}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('plugins.marketplaces.addModal.descriptionPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isAdding}>
              {t('plugins.marketplaces.addModal.cancel')}
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? t('plugins.marketplaces.addModal.adding') : t('plugins.marketplaces.addModal.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

