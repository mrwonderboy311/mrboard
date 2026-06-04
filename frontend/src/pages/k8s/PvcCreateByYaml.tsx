import YamlCreateForm from '@/components/shared/YamlCreateForm'

export default function PvcCreateByYaml() {
  return (
    <YamlCreateForm
      title="通过YAML创建PersistentVolumeClaim"
      apiUrl="/mrboard/apply/v1/CreateByYaml"
      successRedirect="/k8s/pvc"
      placeholder="apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi"
    />
  )
}
