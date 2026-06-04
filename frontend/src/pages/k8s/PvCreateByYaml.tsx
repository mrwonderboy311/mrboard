import YamlCreateForm from '@/components/shared/YamlCreateForm'

export default function PvCreateByYaml() {
  return (
    <YamlCreateForm
      title="通过YAML创建PersistentVolume"
      apiUrl="/mrboard/apply/v1/CreateByYaml"
      successRedirect="/k8s/pv"
      placeholder="apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /tmp/data"
    />
  )
}
