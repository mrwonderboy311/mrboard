import YamlCreateForm from '@/components/shared/YamlCreateForm'

export default function SecretCreateByYaml() {
  return (
    <YamlCreateForm
      title="通过YAML创建Secret"
      apiUrl="/mrboard/apply/v1/CreateByYaml"
      successRedirect="/k8s/secret"
      placeholder="apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
data:
  username: YWRtaW4=
  password: cGFzc3dvcmQ="
    />
  )
}
