import YamlCreateForm from '@/components/shared/YamlCreateForm'

export default function ConfigMapCreateByYaml() {
  return (
    <YamlCreateForm
      title="通过YAML创建ConfigMap"
      apiUrl="/mrboard/apply/v1/CreateByYaml"
      successRedirect="/k8s/configmap"
      placeholder="apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: default
data:
  key: value"
    />
  )
}
